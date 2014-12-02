var mongoose = require('mongoose');

var topicSchema = new mongoose.Schema({
  slug: String,
  headline: String,
  message: String,
  createdAt: Date,
  author: String,
  recipients: Array
});

module.exports = mongoose.model('Topic', topicSchema);