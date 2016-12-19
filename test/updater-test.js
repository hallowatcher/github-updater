
const assert = require('assert');
const proxyquire =  require('proxyquire');
const sinon = require('sinon');

var requestStub = {};
var GithubUpdater = proxyquire('../index', { 'request': requestStub });

describe('updater with valid settings', function () {

    var updater, sandbox;

    // Settings
    let repository = 'test/repo';
    let version = '0.0.9';
    let downloadPath = './';

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        updater = new GithubUpdater({
            repository: repository,
            version: version,
            downloadPath: downloadPath
        });
    });

    afterEach(function () {
        updater = null;
        sandbox.restore();
    });

    it('should initialize the module', function () {
        assert(updater.config.repository === repository);
        assert(updater.config.version === version);
        assert(updater.config.downloadPath === downloadPath);
    });

    it('should get from the right repository', function () {
        let get = sandbox.stub(requestStub, 'get', function (url, callback) {
            assert(url.includes(repository));
        });

        updater.checkForUpdates();
        assert(get.called);
    });

    it('should check empty response array from github releases', function () {
        var get = sandbox.stub(requestStub, 'get', function (url, callback) {
            callback(false, {}, "[]");
        });

        updater.on('error', function (error) {
            assert.equal(error.message, 'No releases have been made!');
        });

        updater.checkForUpdates();
        assert(get.called);
    });

    it('should check for invalid tag name from github releases', function () {
        var get = sandbox.stub(requestStub, 'get', function (url, callback) {
            callback(false, {}, JSON.stringify([{tag_name: 'a.b.c'}]));
        });

        updater.on('error', function (error) {
            assert.equal(error.message, 'The latest release in github has an invalid tag version!');
        });

        updater.checkForUpdates();
        assert(get.called);
    });

    it('should find no later version', function () {
        var get = sandbox.stub(requestStub, 'get', function (url, callback) {
            callback(false, {}, JSON.stringify([{tag_name: '0.0.8'}]));
        });

        let spy = sinon.spy();
        updater.on('updates-none', spy);

        updater.checkForUpdates();
        assert(get.called);
        assert(spy.called);
    });

    it('should find no assets', function () {
        var get = sandbox.stub(requestStub, 'get', function (url, callback) {
            callback(false, {}, JSON.stringify([{tag_name: '0.1.0'}]));
        });

        updater.on('error', function (error) {
            assert.equal(error.message, 'The latest version has no assets!');
        });

        updater.checkForUpdates();
        assert(get.called);
    });

    it('should find no asset that ends with .exe', function () {
        var get = sandbox.stub(requestStub, 'get', function (url, callback) {
            callback(false, {}, JSON.stringify([{tag_name: '0.1.0', assets: []}]));
        });

        updater.on('error', function (error) {
            assert.equal(error.message, 'The latest version has no asset that ends with ".exe"');
        });

        updater.checkForUpdates();
        assert(get.called);
    });

    it('should find update with no error', function () {
        var get = sandbox.stub(requestStub, 'get', function (url, callback) {
            callback(false, {}, JSON.stringify([ { tag_name: '0.1.0', assets: [{name: "blabla.exe", browser_download_url: 'thesource'}] } ]));
        });

        updater.on('updates-found', function (update) {
            assert.equal(update.version, '0.1.0' );
            assert.equal(update.source, 'thesource');
        });

        updater.checkForUpdates();
        assert(get.called);
    });

});