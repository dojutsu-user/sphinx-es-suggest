Development
===========

Clone the repository:

.. prompt:: bash

    git clone https://github.com/readthedocs/readthedocs-sphinx-search
    cd readthedocs-sphinx-search/

Install dependencies via ``npm``:

.. prompt:: bash

   npm install

Generate minified JS and CSS files via ``Gulp``:

.. prompt:: bash

   gulp

Run the test suite with ``tox``. More information about testing is
available at :doc:`Testing page <testing>`.

Local testing
-------------

This extension works when is hosted on Read the Docs,
to make it work locally a custom ``READTHEDOCS_DATA`` js variable is provided to send the search requests to
https://readthedocs-sphinx-search.readthedocs.io/_/api/v2/search/.
Due to our CORS settings your browser will block the requests,
so you'll need to install a plugin like `CORS everywhere`_ to make it work.

.. _CORS everywhere: https://addons.mozilla.org/en-US/firefox/addon/cors-everywhere/

Releasing
---------

Make sure you have the latest version of these packages:

.. code-block:: bash

   python -m pip install --upgrade setuptools wheel twine

Update the version in ``sphinx_search/__init__.py`` and ``package.json``,
and run:

.. prompt:: bash

   npm run build
   npm run changelog

Open a pull request with the changes.
After the pull request is merged, run:

.. prompt:: bash

   make release
   make tag

.. note:: Make sure you don't have any uncommitted changes before releasing.
