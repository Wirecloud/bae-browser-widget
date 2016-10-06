BAE Browser Widget
======================

The BAE Browser Widget is a WireCloud widget that provides the ability to browse, filter and check the offerings available at a BAE instance in a simple widget easily configured just by providing the BAE instance's URL.

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

## Settings

-`Server URL`: The BAE instance to be used.

## Wiring

This widget has no wiring.

## Usage

To use this Wirecloud component you just need to add it to a dashboard and set its `Server URL` preference.

Afterwards, you can specify the filters to be applied to harvested offerings and filter them by name, or display an offering details, by clicking on it, such as the products it offers and its price.

This component uses the [bae-details-widget](https://github.com/Wirecloud/bae-details-widget) and the [bae-search-filters-widget](https://github.com/Wirecloud/bae-search-filters-widget) to work, so those components must be added to the Wirecloud instance too, though they dont have to be added to the dashboard nor configured in any way as they are created dynamically by the `bae-browser-widget`.

## Copyright and License

Copyright (c) 2016 CoNWeT Lab., Universidad Politécnica de Madrid
Licensed under the Apache-2.0 license.
