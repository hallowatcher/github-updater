const app = require('electron').app;
const util = require('util');
const path = require('path');
const rest = require('restler');
const semver = require('semver');
const fs = require('fs');

const appRoot = app.getAppPath();
const child = require('child_process');

let updaterPath = null;

if (fs.existsSync(path.join(appRoot.slice(0, appRoot.indexOf("resources")), 'updater.exe')))
    updaterPath = path.join(appRoot.slice(0, appRoot.indexOf("resources")), 'updater.exe');

const updater = {

    // The callback to run after checking
    callback: null,
    
    // The configuration
    config: {
        repo: null
    },

    // The update retrieved from github
    update: {
        ver: null,
        source: null,
        file: null
    },

    // Initialize
    init: function (config) {
        this.config = util._extend(this.config, config);
    },

    // Check for an update
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
                if (!semver.valid(package.version)) throw 'The version specified in package.json is invalid!';
                if (!semver.valid(data[0].tag_name)) throw 'The latest release has an invalid tag version!';

                let localVer = semver.clean(package.version);
                let latestVer = semver.clean(data[0].tag_name);

                if (semver.gt(latestVer, localVer)) {
                    let asset = data[0].assets.find(asset => asset.name.endsWith('update.asar'));
                    if (!asset) throw 'The latest version has no asset that ends with "update.asar"';

                    this.update.ver = latestVer;
                    this.update.source = asset.browser_download_url;
                }

                return this.end();
            } catch (e) {
                this.end(e);
            }
        });

    },

    // Update
    download: function (callback) {
        if (callback) this.callback = callback;

        if (!this.update.ver || !this.update.source) return this.end('No updates in queue!');

        let url = this.update.source;
        let fileName = 'update';

        rest.get(url).on('complete', (data) => {
            if (data instanceof Error) return this.end('Could not download update!');

            let updateFile = path.join(appRoot, fileName);
            fs.writeFile(updateFile, data, (err) => {
                if (err) return this.end(err);

                fs.rename(updateFile, updateFile + '.asar', (err) => {
                    if (err) return this.end(err);

                    this.update.file = updateFile + '.asar';

                    this.end();
                });
            });
        });
    },

    apply: function () {
        if (!appRoot.endsWith('.asar')) return this.end('Please build the application before trying to apply!');
        if (!updaterPath) return this.end('updater.exe not found!');

        let localAsar = appRoot;
        let updateAsar = this.update.file;

        if (!fs.existsSync(updateAsar)) return this.end('Update file does not exist!');

        let winArgs = `${updaterPath} ${updateAsar} ${localAsar}`;
        if (process.platform === 'win32') {
            child.spawn('cmd', ['/s', '/c', `"${winArgs}"`], { detached: true, windowsVerbatimArguments: true, stdio: 'ignore' });
            child.unref();
            app.quit();   
        } else {
            return this.end('Only windows supported for now!');
        }
    },

    end: function (error) {
        if (typeof this.callback !== 'function') return false;

        this.callback.call(this, error, this.update.ver);
    }

}

module.exports = updater;