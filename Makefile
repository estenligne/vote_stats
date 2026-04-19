
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

include ../libweb/module.mk

$(PUB_FILE): $(VALID)
	tar -czhf $(PUB_FILE) $(SO_FILE) --exclude=.git public views migrations ai i18n .htaccess settings.json
	scp $(PUB_FILE) vps:

# Also compile the SPA bundle
debug: spa_bundle
release: spa_bundle

