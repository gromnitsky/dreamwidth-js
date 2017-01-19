.DELETE_ON_ERROR:

pp-%:
	@echo "$(strip $($*))" | tr ' ' \\n

out := .
TAGS := Import from G+
SECURITY := private
TAR :=
$(if $(filter %,$(TAR)),,$(error TAR variable must not be empty))

mkdir = @mkdir -p $(dir $@)
src := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))

json.src.dir := $(out)/Takeout/json
json.src := $(wildcard $(json.src.dir)/*.json)

html.dest := $(patsubst %.json, %.html, $(json.src))
posted.dest := $(patsubst %.json, %.POSTED, $(json.src))

.PHONY: post
post: $(posted.dest)

# prepare the source .json files. we need to remove all spaces from
# the file names; for some reason the ':' char is also confusing to
# Make.
$(out)/Takeout/.target: $(TAR)
	tar xfz $<
	mv "$(dir $@)/Google+ Stream" $(json.src.dir)
	cd $(json.src.dir) && for file in *; do \
		mv "$$file" `stat "$$file" -c %y | sed 's/[ :]/_/g'`.json; \
	done
	touch $@

# during the 1st run, there won't be any .json files in $(json.src)
# for their directory doesn't exist yet; thus we need to auto-restart Make,
# after unpacking the tar.
.json.mk: $(out)/Takeout/.target
	@echo Restarting Make
	@touch $@

-include .json.mk

sq = '$(subst ','\'',$(1))'
# '# emacs font-lock

%.POSTED: %.json
	$(src)/google-plus-json2html < $< | $(src)/dreamwidth-js entry-post \
		-s $(call sq,$(shell json title < $< | head -c 100)) \
		-d '$(shell json published < $<)' \
		-t '$(TAGS)' --security $(SECURITY) --backdated > $@


# debug
%.html: %.json
	$(src)/google-plus-json2html -s < $< > $@

.PHONY: html
html: $(html.dest)
