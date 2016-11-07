'use strict';

const fetch = require('node-fetch');
const bluebird = require('bluebird');
const { flattenDeep } = require('lodash');
const fs = require('fs');
const config = require('./config');
class Fetcher {
  constructor(pool) {
    this.pool = pool;
    this.sources = [];
  }

  getThreadList(boardId) {
    console.log(`Fething https://2ch.hk/${boardId}/threads.json`)
    return fetch(`https://2ch.hk/${boardId}/threads.json`)
      .then(response => response.json())
      .then(board => board.threads.map(thread => thread.num));
  }

  getWebmList(boardId, threadId) {
    console.log(`Fetching https://2ch.hk/${boardId}/res/${threadId}.json`)
    return fetch(`https://2ch.hk/${boardId}/res/${threadId}.json`)
      .then(response => response.json())
      .then(response => response.threads[0].posts)
      .then(posts => {
        return posts.map(post => {
          return post.files
            .filter(file => file.path.includes('webm'))
            .map(file => `https://2ch.hk/${boardId}/${file.path}`);
        });
      });
  }

  update() {
    this.getThreadList('b')
      .then(threads => threads.slice(0, config.fetcherThreadCount))
      .then(threads => {
        return bluebird.mapSeries(threads, (threadId) => this.getWebmList('b', threadId));
      })
      .then(data => flattenDeep(data))
      .then(data => this.pool.add(data))
      .then(data => console.log(`Fetch done. Found ${data.length} items.`))
      .catch(err => console.log(err));
  }

  start() {
    this.update();
    setInterval(() => this.update)
  }

}

module.exports = Fetcher;
