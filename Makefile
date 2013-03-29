## TEST

TESTER = ./node_modules/.bin/mocha
OPTS = --require ./test/init.js --ignore-leaks
TESTS = test/*.test.js

test:
	$(TESTER) $(OPTS) $(TESTS)
test-verbose:
	$(TESTER) $(OPTS) --reporter spec $(TESTS)
testing:
	$(TESTER) $(OPTS) --watch $(TESTS)

## WORKFLOW

GITBRANCH = $(shell git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/\1/')

pull:
	git pull origin $(GITBRANCH)

push:
	git push origin $(GITBRANCH)

deps: package.json
	npm install > deps

update: pull deps

request: push
	open "https://github.com/marcusgreenwood/hatchjs/pull/new/marcusgreenwood:master...$(GITBRANCH)"

.PHONY: test doc
