readthedocs-sphinx-search
=========================

|docs| |license| |build-status|

``readthedocs-sphinx-search`` is a `Sphinx`_ extension to enable `Read the Docs`_'s
in-doc search UI.

This extension is developed to be used on `Read the Docs`_.


In-Doc Search UI
----------------

Using the existing search backend of `Read the Docs`_,
this extension is designed to greatly improve the search experience
of the reader. This adds the full page search UI to the docs
which supports ``search as you type`` feature.

.. figure:: ./_static/demo.gif
    :align: center
    :target: ./_static/demo.gif

    demo

Browser Support
~~~~~~~~~~~~~~~

The JavaScript for this extension is written with new features and syntax,
however, we also want to support older browsers upto IE11.
Therefore, we are using babel to transpile the new and shiny JavaScript code
to support all browsers.

The CSS is also autoprefixed to extend the support to most of the browsers.

Link To The Search UI
~~~~~~~~~~~~~~~~~~~~~

If you want to share your search, you can do so by passing a URL param -- ``rtd_search``.
The search UI will opens on page loads and search for the query specified in the URL.

Example::

    https://readthedocs-sphinx-search.readthedocs.io/en/latest?rtd_search=get involved


.. toctree::
   :maxdepth: 1
   :caption: Table of Contents

   installation
   custom-design
   development
   testing
   get-involved


.. _Sphinx: https://www.sphinx-doc.org/
.. _Read the Docs: https://readthedocs.org


.. |docs| image:: https://readthedocs.org/projects/readthedocs-sphinx-search/badge/?version=latest
    :alt: Documentation Status
    :target: https://readthedocs-sphinx-search.readthedocs.io/en/latest/?badge=latest

.. |license| image:: https://img.shields.io/github/license/rtfd/readthedocs-sphinx-search.svg
   :target: LICENSE
   :alt: Repository license

.. |build-status| image:: https://travis-ci.org/rtfd/readthedocs-sphinx-search.svg?branch=master
   :alt: Build Status
   :target: https://travis-ci.org/rtfd/readthedocs-sphinx-search
