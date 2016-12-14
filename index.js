const app = require('electron').app;
const util = require('util');
const path = require('path');
const rest = require('restler');
const semver = require('semver');
const appRoot = app.getAppPath();

const updater = {

    callback: null,
    
    config: {
        repo: null
    },

    update: {
        ver: null,
        source: null
    },

    init: function (config) {
        this.config = util._extend(this.config, config);
    },

    check: function (callback) {
        if (callback) this.callback = callback;

        if (!this.config.repo) 
            return this.end('The repo has not been defined!')

        let package = require(path.join(appRoot, 'package.json'));
        if (!package.version)
            return this.end('This app\'s version could not be detected!');
        
        rest.get(`https://api.github.com/repos/${this.config.repo}/releases`).on('complete', (data) => {
            if (data instanceof Error) return this.end('Could not connect to repo!');

            try {
                if (!data) throw 'No data was received!';
                if (data.length === 0) throw 'No releases have been made!';

                if (semver.gt(data[0].tag_name, package.version)) 
                    this.update.ver = data[0].tag_name;

                return this.end();
            } catch (e) {
                this.end(e);
            }
        });

    },

    end: function (error) {
        if (typeof this.callback !== 'function') return false;

        this.callback.call(this, error, this.update.ver);
    }

}

module.exports = updater;