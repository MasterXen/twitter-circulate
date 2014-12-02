var _ = require('lodash');
var secrets = require('../config/secrets');
var request = require("request");
var parse = require('csv-parse');
var Twit = require('twit');
var Topic = require('../models/Topic');

/**
 * GET /campaign
 * Campaign manangement page.
 */

exports.getCampaign = function(req, res) {
  res.render('campaign/topic', {
    title: 'Topic Management'
  });
};

/**
 * GET /campaign/verify
 * Influencer verification page
 */

exports.getListInfluencers = function(req, res) {
  if (req.session.candidates === undefined) {
    return res.redirect('/campaign');
  }

  var accountData = req.session.candidates;
  var cutoff = Math.floor(accountData.length * 0.33);

  res.render('campaign/list', {
    title: 'Influential Accounts',
    accounts: accountData,
    highestIndex: cutoff
  });
};

/**
 * GET /campaign/distribute
 */

exports.getTopic = function(req, res) {
  if (req.session.candidates === undefined) {
    return res.redirect('/campaign');
  }
  res.render('campaign/distribute', {
    title: 'Circulate Topic',
  });
};

/**
 * GET /campaign/distribute
 */

exports.postTopic = function(req, res) {
  req.assert('headline', 'Headline is required.').notEmpty();
  req.assert('message', 'Topic body is required.').notEmpty();
  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/campaign/distribute');
  }

  // Create a slug to have a easy to use URL portion
  var thisSlug = req.body.headline.toLowerCase().replace(/ /g, '-')
                .replace(/'/g, '').replace(/\?/g, '');

  var candidateSet = req.session.candidates;
  var invited = candidateSet.slice(0, Math.floor(candidateSet.length * 0.33));

  var topic = new Topic({
    headline: req.body.headline,
    message: req.body.message,
    slug: thisSlug,
    author: 'Ishan Chatterjee',
    createdAt: new Date(),
    recipients: invited
  });

  topic.save(function (err) {
    if (err !== null) {
      console.warn(err);
      req.flash('errors', { msg: 'Unable to start the conversation: topic could not be saved.' });
      res.redirect("/campaign/distribute");
    } else {
      // Send a direct message
      var token = _.find(req.user.tokens, { kind: 'twitter' });
      var T = new Twit({
        consumer_key: secrets.twitter.consumerKey,
        consumer_secret: secrets.twitter.consumerSecret,
        access_token: token.accessToken,
        access_token_secret: token.tokenSecret
      });
      var topicUrl = "/participate/" + topic._id + "/" + topic.slug;
      var messageText = 'I just added you to my conversation about "' + topic.headline + '"\n' + 'https://circulate.bazaarvoice.com' + topicUrl;
      T.post('direct_messages/new', { text: messageText, screen_name: 'LoyalInfluencer' }, function(err, reply) {
        if (err !== null) {
          console.error(err);
        }
      });

      req.flash('success', { msg: 'Great! An invitiation to participate in this conversation was sent to this topic\'s influencers' });
      res.redirect(topicUrl);
    }
  });
};

/**
 * POST /campaign
 * Setup a new campaign
 */

exports.postCampaign = function(req, res, next) {
  var phrase = req.body.phrase;
  var hashtag = req.body.hashtag ? "#" + req.body.hashtag : null;
  var account = req.body.account ? "@" + req.body.account : null;

  var lookup = phrase || hashtag || account || null;
  if (lookup === null) {
    req.flash('errors', { msg: 'Enter at least one term to use for analysis'});
    return res.redirect('/campaign');
  }

  var smUrl = "http://socialmention.com/search?t=all&f=csv&metadata=users&filter_source=twitter&q=" + encodeURIComponent(lookup);
  request.get({
    url: smUrl
  }, function(err, urlResp, body) {
    parse(body, {columns: true}, function(csvParseError, output) {

      if (err === null && csvParseError == null) {
        req.session.candidates = output;
        res.redirect('/campaign/list');
      } else {
        req.flash('errors', { msg: 'Unable to analyze, please try again' });
        res.redirect('/campaign');
      }
    });
  });
};