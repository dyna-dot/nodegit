var assert = require("assert");
var path = require("path");
var local = path.join.bind(path, __dirname);
var promisify = require("promisify-node");
var fse = promisify(require("fs-extra"));

describe("Tree", function() {
  var RepoUtils = require("../utils/repository_setup");

  var repoPath = local("../repos/tree");

  beforeEach(function() {
    var test = this;
    return RepoUtils.createRepository(repoPath)
      .then(function(repo) {
        test.repository = repo;
      });
  });

  after(function() {
    return fse.remove(repoPath);
  });

  it("walks its entries and returns the same entries on both progress and end",
  function() {
    var repo = this.repository;
    var progressEntries = [];
    var endEntries;

    return RepoUtils.commitFileToRepo(repo, "test.txt", "")
      .then(function(commit) {
        return RepoUtils.commitFileToRepo(repo, "foo/bar.txt", "", commit);
      })
      .then(function(commit) {
        return commit.getTree();
      })
      .then(function(tree) {
        assert(tree);

        return new Promise(function (resolve, reject) {
          var walker = tree.walk();

          walker.on("entry", function(entry) {
            progressEntries.push(entry);
          });
          walker.on("end", function(entries) {
            endEntries = entries;
            resolve();
          });
          walker.on("error", reject);

          walker.start();
        });
      })
      .then(function() {
        assert(progressEntries.length);
        assert(endEntries && endEntries.length);

        assert.equal(
          progressEntries.length, endEntries.length,
          "Different number of progress entries and end entries"
        );

        function getEntryPath(entry) {
          return entry.path();
        }

        var progressFilePaths = progressEntries.map(getEntryPath).sort();
        var endFilePaths = endEntries.map(getEntryPath);

        assert.deepEqual(
          progressFilePaths.sort(), endFilePaths.sort(),
          "progress entries do not match end entries"
        );
      });
  });
});
