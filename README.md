BAE Browser Widget
======================

The BAE Browser Widget is a WireCloud widget that provides the ability to browse, filter and install the Wirecloud offerings available at a Bussiness API Ecosystem instance in a simple widget, easily configured by just providing the BAE instance's URL.

This widget requires the [bae-details-widget](https://github.com/Wirecloud/bae-details-widget) and the [bae-search-filters-widget](https://github.com/Wirecloud/bae-search-filters-widget) to be added to the Wirecloud instance resources in order to work.

Build
-----

Be sure to have installed [Node.js](http://node.js) and [Bower](http://bower.io) in your system. For example, you can install it on Ubuntu and Debian running the following commands:

```bash
curl -sL https://deb.nodesource.com/setup | sudo bash -
sudo apt-get install nodejs
sudo apt-get install npm
sudo npm install -g bower
```

If you want the last version of the widget, you should change to the `develop` branch:

```bash
git checkout develop
```

Install other npm dependencies by running: (need root because some libraries use applications, check package.json before to be sure)

```bash
sudo npm install
```

For build the widget you need download grunt:

```bash
sudo npm install -g grunt-cli
```

And now, you can use grunt:

```bash
grunt
```

If everything goes well, you will find a wgt file in the `dist` folder.

## Documentation

Documentation about how to use this widget is available on the
[User Guide](src/doc/userguide.md). Anyway, you can find general information
about how to use widgets on the
[WireCloud's User Guide](https://wirecloud.readthedocs.io/en/stable/user_guide/)
available on Read the Docs.

## Copyright and License

Copyright (c) 2016 CoNWeT Lab., Universidad Politécnica de Madrid
Licensed under the Apache-2.0 license.
