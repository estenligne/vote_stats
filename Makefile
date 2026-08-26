
default: debug

BUILDDIR := build/

OBJECT_FILES := \
	$(BUILDDIR)startup.o \
	$(BUILDDIR)controllers/add.o \
	$(BUILDDIR)controllers/home.o \
	$(BUILDDIR)controllers/account.o

SITE_NAME := vote_stats

INCLUDE_FILES := includes/*.h controllers/*.h

$(BUILDDIR):
	mkdir -p $(BUILDDIR)controllers/

PUBLISHED_ASSETS := public views migrations i18n .htaccess settings.json
publish: publish-with-rsync

include ../libweb/module.mk

# Also compile the SPA bundle
debug: spa_bundle
release: spa_bundle

