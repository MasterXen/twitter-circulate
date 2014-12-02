var _ = require('lodash');
var Topic = require('../models/Topic');

/**
 * GET /participate
 * Campaign manangement page.
 */

exports.getTopic = function(req, res) {
  Topic.findById(req.params.id, function(err, topic) {
    res.render('participate/topic', {
      title: topic.headline,
      item: topic
    });
  });
};