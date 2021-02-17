"""UI tests."""

import json
import os
import textwrap
import time
from urllib import parse

import pytest
import sphinx
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests import TEST_DOCS_SRC
from tests.utils import (
    InjectJsManager,
    get_ajax_overwrite_func,
    set_viewport_size
)

READTHEDOCS_DATA = {
    'project': 'docs',
    'version': 'latest',
    'language': 'en',
}

# This will be inserted in the html page
# to support the working of extension
# in test cases.
SCRIPT_TAG = '<script>var READTHEDOCS_DATA = {};</script>'.format(
    json.dumps(READTHEDOCS_DATA)
)


def open_search_modal(driver):
    """Open search modal and checks if its open correctly."""
    sphinx_search_input = driver.find_element_by_css_selector(
        'div[role="search"] input'
    )
    search_outer_wrapper = driver.find_element_by_class_name(
        'search__outer__wrapper'
    )

    assert (
        search_outer_wrapper.is_displayed() is False
    ), 'search modal should not be displayed when the page loads'

    sphinx_search_input.click()

    # wait for the fadeIn animation to get completed
    time.sleep(0.5)

    assert (
        search_outer_wrapper.is_displayed() is True
    ), 'search modal should open after clicking on input field'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_index_page_opening(selenium, app, status, warning):
    """Test if `index.html` is generated/opening correctly."""
    app.build()
    path = app.outdir / 'index.html'
    selenium.get(f'file://{path}')
    assert (
        'readthedocs-sphinx-search' in selenium.title
    ), 'title of the documentation must contains "readthedocs-sphinx-search"'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_appending_of_initial_html(selenium, app, status, warning):
    """Test if initial html is correctly appended to the body after the DOM is loaded."""
    app.build()
    path = app.outdir / 'index.html'

    with InjectJsManager(path, SCRIPT_TAG) as _:
        selenium.get(f'file://{path}')

        search_outer_wrapper = selenium.find_elements_by_class_name(
            'search__outer__wrapper'
        )

        # there should be only one of these element
        assert (
            len(search_outer_wrapper) == 1
        ), 'search outer wrapper is not injected correctly in the dom'

        search_outer_wrapper = search_outer_wrapper[0]

        assert (
            search_outer_wrapper.is_displayed() is False
        ), 'search outer wrapper shoud not be displayed when the page loads'

        initial_html = textwrap.dedent(
            """
            <div class="search__outer">
                <div class="search__cross" title="Close">
                    <!--?xml version="1.0" encoding="UTF-8"?-->
                    <svg class="search__cross__img" enable-background="new 0 0 612 612" version="1.1" viewBox="0 0 612 612" xml:space="preserve" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="612 36.004 576.52 0.603 306 270.61 35.478 0.603 0 36.004 270.52 306.01 0 576 35.478 611.4 306 341.41 576.52 611.4 612 576 341.46 306.01"></polygon>
                    </svg>
                </div>
                <input class="search__outer__input" placeholder="Search...">
                <span class="bar"></span>
            </div>
            <div class="rtd__search__credits">
                Search by <a href="https://readthedocs.org/">Read the Docs</a> &amp; <a href="https://readthedocs-sphinx-search.readthedocs.io/en/latest/">readthedocs-sphinx-search</a>
            </div>
            """
        )
        search_outer_wrapper_html = search_outer_wrapper.get_attribute('innerHTML')
        initial_html = [ele.strip() for ele in initial_html.strip().split('\n') if ele]
        for line in initial_html:
            if line:
                assert (
                    line in search_outer_wrapper_html
                ), f'{line} -- must be present in page source'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_opening_of_search_modal(selenium, app, status, warning):
    """Test if the search modal is opening correctly."""
    app.build()
    path = app.outdir / 'index.html'

    with InjectJsManager(path, SCRIPT_TAG) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_open_search_modal_when_forward_slash_button_is_pressed(selenium, app, status, warning):
    """Test if the search modal is opening correctly."""
    app.build()
    path = app.outdir / 'index.html'

    with InjectJsManager(path, SCRIPT_TAG) as _:
        selenium.get(f'file://{path}')

        search_outer_wrapper = selenium.find_element_by_class_name(
            'search__outer__wrapper'
        )

        assert (
            search_outer_wrapper.is_displayed() == False
        ), 'search__outer__wrapper should not be displayed on page load'

        body = selenium.find_element_by_css_selector('body')
        body.send_keys('/')

        assert (
            search_outer_wrapper.is_displayed() == True
        ), 'search__outer__wrapper should be displayed when forward slash button is pressed'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_focussing_of_input_field(selenium, app, status, warning):
    """Test if the input field in search modal is focussed after opening the modal."""
    app.build()
    path = app.outdir / 'index.html'

    with InjectJsManager(path, SCRIPT_TAG) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)

        sphinx_search_input = selenium.find_element_by_css_selector(
            'div[role="search"] input'
        )
        search_outer_input = selenium.find_element_by_class_name(
            'search__outer__input'
        )

        assert (
            sphinx_search_input != selenium.switch_to.active_element
        ), 'active element should be input field of the modal and not the default search field'

        assert (
            search_outer_input == selenium.switch_to.active_element
        ), 'active element should be search input field of the modal'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_closing_the_modal_by_clicking_on_backdrop(selenium, app, status, warning):
    """Test if the search modal is closed when user clicks on backdrop."""
    app.build()
    path = app.outdir / 'index.html'

    with InjectJsManager(path, SCRIPT_TAG) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)

        search_outer_wrapper = selenium.find_element_by_class_name(
            'search__outer__wrapper'
        )
        search_outer = selenium.find_element_by_class_name('search__outer')
        actions = webdriver.common.action_chains.ActionChains(selenium)
        actions.move_to_element_with_offset(
            search_outer, -10, -10  # -ve offsets to move the mouse away from the search modal
        )
        actions.click()
        actions.perform()
        WebDriverWait(selenium, 10).until(
            EC.invisibility_of_element(search_outer_wrapper)
        )

        assert (
            search_outer_wrapper.is_displayed() is False
        ), 'search modal should disappear after clicking on backdrop'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_closing_the_modal_by_escape_button(selenium, app, status, warning):
    """Test if the search modal is closed when escape button is pressed."""
    app.build()
    path = app.outdir / 'index.html'

    with InjectJsManager(path, SCRIPT_TAG) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)

        search_outer_wrapper = selenium.find_element_by_class_name(
            'search__outer__wrapper'
        )

        # active element is the search input on the modal
        selenium.switch_to.active_element.send_keys(Keys.ESCAPE)
        WebDriverWait(selenium, 10).until(
            EC.invisibility_of_element(search_outer_wrapper)
        )

        assert (
            search_outer_wrapper.is_displayed() is False
        ), 'search modal should disappear after pressing Escape button'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_closing_modal_by_clicking_cross_icon(selenium, app, status, warning):
    """Test if the search modal is closed when cross icon is clicked."""
    app.build()
    path = app.outdir / 'index.html'

    with InjectJsManager(path, SCRIPT_TAG) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)

        search_outer_wrapper = selenium.find_element_by_class_name(
            'search__outer__wrapper'
        )

        cross_icon = selenium.find_element_by_class_name(
            'search__cross'
        )
        cross_icon.click()
        WebDriverWait(selenium, 10).until(
            EC.invisibility_of_element(search_outer_wrapper)
        )

        assert (
            search_outer_wrapper.is_displayed() is False
        ), 'search modal should disappear after clicking on cross icon'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_no_results_msg(selenium, app, status, warning):
    """Test if the user is notified that there are no search results."""
    app.build()
    path = app.outdir / 'index.html'

    # to test this, we need to override the $.ajax function
    ajax_func = get_ajax_overwrite_func('zero_results')
    injected_script = SCRIPT_TAG + ajax_func

    with InjectJsManager(path, injected_script) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)

        search_outer_input = selenium.find_element_by_class_name(
            'search__outer__input'
        )
        search_outer_input.send_keys('no results for this')
        WebDriverWait(selenium, 10).until(
            EC.text_to_be_present_in_element(
                (By.CLASS_NAME, 'search__result__box'),
                'No results found'
            )
        )
        search_result_box = selenium.find_element_by_class_name(
            'search__result__box'
        )

        assert (
            search_result_box.text == 'No results found'
        ), 'user should be notified that there are no results'

        assert (
            len(search_result_box.find_elements_by_css_selector('*')) == 0
        ), 'search result box should not have any child elements because there are no results'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_error_msg(selenium, app, status, warning):
    """Test if the user is notified that there is an error while performing search"""
    app.build()
    path = app.outdir / 'index.html'

    # to test this, we need to override the $.ajax function
    ajax_func = get_ajax_overwrite_func('error')
    injected_script = SCRIPT_TAG + ajax_func

    with InjectJsManager(path, injected_script) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)

        search_outer_input = selenium.find_element_by_class_name(
            'search__outer__input'
        )
        search_outer_input.send_keys('this will result in error')
        WebDriverWait(selenium, 10).until(
            EC.text_to_be_present_in_element(
                (By.CLASS_NAME, 'search__result__box'),
                'There was an error. Please try again.'
            )
        )
        search_result_box = selenium.find_element_by_class_name(
            'search__result__box'
        )

        assert (
            search_result_box.text == 'There was an error. Please try again.'
        ), 'user should be notified that there is an error'

        assert (
            len(search_result_box.find_elements_by_css_selector('*')) == 0
        ), 'search result box should not have any child elements because there are no results'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_searching_msg(selenium, app, status, warning):
    """Test if the user is notified that search is in progress."""
    app.build()
    path = app.outdir / 'index.html'

    # to test this, we need to override the $.ajax function
    ajax_func = get_ajax_overwrite_func('timeout__zero_results')
    injected_script = SCRIPT_TAG + ajax_func

    with InjectJsManager(path, injected_script) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)

        search_outer_input = selenium.find_element_by_class_name(
            'search__outer__input'
        )
        search_outer_input.send_keys(
            'searching the results'
        )
        search_result_box = selenium.find_element_by_class_name(
            'search__result__box'
        )

        assert (
            search_result_box.text == 'Searching ....'
        ), 'user should be notified that search is in progress'

        WebDriverWait(selenium, 10).until(
            EC.text_to_be_present_in_element(
                (By.CLASS_NAME, 'search__result__box'),
                'No results found'
            )
        )

        # fetching it again from the DOM to update its status
        search_result_box = selenium.find_element_by_class_name(
            'search__result__box'
        )

        assert (
            len(search_result_box.find_elements_by_css_selector('*')) == 0
        ), 'search result box should not have any child elements because there are no results'
        assert (
            search_result_box.text == 'No results found'
        ), 'user should be notified that there are no results'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_results_displayed_to_user(selenium, app, status, warning):
    """Test if the results are displayed correctly to the user."""
    app.build()
    path = app.outdir / 'index.html'

    # to test this, we need to override the $.ajax function
    ajax_func = get_ajax_overwrite_func('dummy_results')
    injected_script = SCRIPT_TAG + ajax_func

    with InjectJsManager(path, injected_script) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)

        search_outer_input = selenium.find_element_by_class_name(
            'search__outer__input'
        )
        search_outer_input.send_keys('sphinx')
        search_result_box = selenium.find_element_by_class_name(
            'search__result__box'
        )
        WebDriverWait(selenium, 10).until(
            EC.visibility_of_all_elements_located(
                (By.CLASS_NAME, 'search__result__single')
            )
        )

        # fetching search_result_box again to update its content
        search_result_box = selenium.find_element_by_class_name(
            'search__result__box'
        )

        assert (
            len(
                search_result_box.find_elements_by_class_name(
                    'search__result__single'
                )
            )
            == 1
        ), 'search result box should have results from only 1 page (as per the dummy_results.json)'

        assert (
            len(
                search_result_box.find_elements_by_class_name(
                    'outer_div_page_results'
                )
            ) == 3
        ), 'total 3 results should be shown to the user (as per the dummy_results.json)'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_navigate_results_with_arrow_up_and_down(selenium, app, status, warning):
    """Test if user is able to navigate through search results via keyboard."""
    app.build()
    path = app.outdir / 'index.html'

    # to test this, we need to override the $.ajax function
    ajax_func = get_ajax_overwrite_func('dummy_results')
    injected_script = SCRIPT_TAG + ajax_func

    with InjectJsManager(path, injected_script) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)

        search_outer_input = selenium.find_element_by_class_name(
            'search__outer__input'
        )
        search_outer_input.send_keys('sphinx')
        search_result_box = selenium.find_element_by_class_name(
            'search__result__box'
        )
        WebDriverWait(selenium, 10).until(
            EC.visibility_of_all_elements_located(
                (By.CLASS_NAME, 'search__result__single')
            )
        )

        # fetching search_result_box again to update its content
        search_result_box = selenium.find_element_by_class_name(
            'search__result__box'
        )
        results = selenium.find_elements_by_class_name(
            'outer_div_page_results'
        )
        search_outer_input.send_keys(Keys.DOWN)

        assert results[0] == selenium.find_element_by_css_selector(
            '.outer_div_page_results.active'
        ), 'first result should be active'

        search_outer_input.send_keys(Keys.DOWN)
        assert results[1] == selenium.find_element_by_css_selector(
            '.outer_div_page_results.active'
        ), 'second result should be active'

        search_outer_input.send_keys(Keys.UP)
        search_outer_input.send_keys(Keys.UP)
        assert results[-1] == selenium.find_element_by_css_selector(
            '.outer_div_page_results.active'
        ), 'last result should be active'

        search_outer_input.send_keys(Keys.DOWN)
        assert results[0] == selenium.find_element_by_css_selector(
            '.outer_div_page_results.active'
        ), 'first result should be active'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_enter_button_on_input_field_when_no_result_active(selenium, app, status, warning):
    """
    Test if pressing Enter on search field takes the user to search page.

    User will be redirected to the search page only if no result is active.
    A search result becomes active if the user reaches to it via ArrowUp and
    ArrowDown buttons.
    """
    app.build()
    path = app.outdir / 'index.html'

    # to test this, we need to override the $.ajax function
    ajax_func = get_ajax_overwrite_func('error')
    injected_script = SCRIPT_TAG + ajax_func

    with InjectJsManager(path, injected_script) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)

        search_outer_input = selenium.find_element_by_class_name(
            'search__outer__input'
        )
        search_outer_input.send_keys('i am searching')
        search_outer_input.send_keys(Keys.ENTER)
        WebDriverWait(selenium, 10).until(
            EC.url_contains(app.outdir / 'search.html')
        )

        # enter button should redirect the user to search page
        assert (
            'search.html' in selenium.current_url
        ), 'search.html must be in the url of the page'

        assert (
            'Search' in selenium.title
        ), '"Search" must be in the title of the page'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_position_search_modal(selenium, app, status, warning):
    """Test if the search modal is in the middle of the page."""
    app.build()
    path = app.outdir / 'index.html'

    with InjectJsManager(path, SCRIPT_TAG) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)

        search_outer_wrapper = selenium.find_element_by_class_name(
            'search__outer__wrapper'
        )
        search_outer = selenium.find_element_by_class_name(
            'search__outer'
        )

        window_sizes = [
            # mobile-sized viewports
            (414, 896),
            (375, 812),
            (414, 896),
            (375, 812),

            # desktop-sized viewports
            (800, 600),
            (1280, 720),
            (1366, 768),
            (1920, 1080),
        ]

        for width, height in window_sizes:
            set_viewport_size(driver=selenium, width=width, height=height)
            modal_location = search_outer.location
            modal_size = search_outer.size

            inner_width, inner_height = selenium.execute_script(
                "return [window.innerWidth, window.innerHeight];"
            )

            # checking for horizontal position
            right = inner_width - (modal_size['width'] + modal_location['x'])
            left =  inner_width - (modal_size['width'] + right)
            assert (
                right == pytest.approx(left, 1)
            ), f'Vertical margins should be the same size for {width}x{height} ({left} / {right}).'

            # checking for vertical position
            bottom = inner_height - (modal_size['height'] + modal_location['y'])
            top = inner_height - (modal_size['height'] + bottom)
            assert (
                top == pytest.approx(bottom, 1)
            ), f'Horizontal margins should be the same size for {width}x{height} ({top} / {bottom}).'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_writing_query_adds_rtd_search_as_url_param(selenium, app, status, warning):
    """Test if the `rtd_search` query param is added to the url when user is searching."""
    app.build()
    path = app.outdir / 'index.html'

    # to test this, we need to override the $.ajax function
    ajax_func = get_ajax_overwrite_func('error')
    injected_script = SCRIPT_TAG + ajax_func

    with InjectJsManager(path, injected_script) as _:
        selenium.get(f'file://{path}')
        open_search_modal(selenium)
        query = 'searching'
        query_len = len(query)

        assert (
            'rtd_search=' not in parse.unquote(selenium.current_url)
        ), 'rtd_search param must not be present in the url when page loads'

        search_outer_input = selenium.find_element_by_class_name(
            'search__outer__input'
        )
        search_outer_input.send_keys(query)
        query_param = f'rtd_search={query}'

        # Wait till it updates the URL
        time.sleep(0.5)

        assert (
            query_param in parse.unquote(selenium.current_url)
        ), 'query param must be present in the url'

        # deleting query from input field
        for i in range(query_len):
            search_outer_input.send_keys(Keys.BACK_SPACE)
            time.sleep(0.5)

            if i != query_len -1:

                current_query = query[:query_len - i - 1]
                current_url = parse.unquote(selenium.current_url)
                query_in_url = current_url[current_url.find('rtd_search'):]

                assert (
                    f'rtd_search={current_query}' == query_in_url
                )

        assert (
            'rtd_search=' not in parse.unquote(selenium.current_url)
        ), 'rtd_search param must not be present in the url if query is empty'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_modal_open_if_rtd_search_is_present(selenium, app, status, warning):
    """Test if search modal opens if `rtd_search` query param is present in the URL."""
    app.build()
    path = app.outdir / 'index.html'

    # to test this, we need to override the $.ajax function
    ajax_func = get_ajax_overwrite_func('error')
    injected_script = SCRIPT_TAG + ajax_func

    with InjectJsManager(path, injected_script) as _:
        selenium.get(f'file://{path}?rtd_search=i am searching')
        time.sleep(3)  # give time to open modal and start searching

        search_outer_wrapper = selenium.find_element_by_class_name(
            'search__outer__wrapper'
        )
        search_result_box = selenium.find_element_by_class_name(
            'search__result__box'
        )

        assert (
            search_outer_wrapper.is_displayed() is True
        ), 'search modal should displayed when the page loads'
        assert (
            search_result_box.text == 'There was an error. Please try again.'
        ), 'user should be notified that there is error while searching'
        assert (
            len(search_result_box.find_elements_by_css_selector('*')) == 0
        ), 'search result box should not have any child elements because there are no results'


@pytest.mark.sphinx(srcdir=TEST_DOCS_SRC)
def test_rtd_search_remove_from_url_when_modal_closed(selenium, app, status, warning):
    """Test if `rtd_search` query param is removed when the modal is closed."""
    app.build()
    path = app.outdir / 'index.html'

    # to test this, we need to override the $.ajax function
    ajax_func = get_ajax_overwrite_func('error')
    injected_script = SCRIPT_TAG + ajax_func

    with InjectJsManager(path, injected_script) as _:
        selenium.get(f'file://{path}?rtd_search=i am searching')
        time.sleep(3)  # give time to open modal and start searching

        # closing modal
        search_outer = selenium.find_element_by_class_name('search__outer')
        search_outer_wrapper = selenium.find_element_by_class_name(
            'search__outer__wrapper'
        )
        actions = webdriver.common.action_chains.ActionChains(selenium)
        actions.move_to_element_with_offset(
            search_outer, -10, -10  # -ve offsets to move the mouse away from the search modal
        )
        actions.click()
        actions.perform()
        WebDriverWait(selenium, 10).until(
            EC.invisibility_of_element(search_outer_wrapper)
        )

        assert (
            search_outer_wrapper.is_displayed() is False
        ), 'search modal should disappear after clicking on backdrop'
        assert (
            'rtd_search=' not in parse.unquote(selenium.current_url)
        ), 'rtd_search url param should not be present in the url when the modal is closed.'
