# -*- coding: utf-8 -*-

"""Test working of extension."""

import os
import pytest
from tests import TEST_DOCS_SRC


class TestExtensionWorking:

    """Test if the extension is working correctly."""

    @pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
    def test_static_files_exists(self, app, status, warning):
        """Test if the static files are present in the _build folder."""
        app.build()
        path = app.outdir

        js_file = os.path.join(path, '_static', 'js', 'rtd_sphinx_search.js')
        css_file = os.path.join(path, '_static', 'css', 'rtd_sphinx_search.css')

        assert (
            os.path.exists(js_file) is True
        ), 'js file should be copied to build folder'

        assert (
            os.path.exists(css_file) is True
        ), 'css file should be copied to build folder'
