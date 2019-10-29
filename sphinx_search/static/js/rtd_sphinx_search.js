const MAX_SUGGESTIONS = 50;
const MAX_SECTION_RESULTS = 3;
const MAX_SUBSTRING_LIMIT = 100;

// Possible states of search modal
const SEARCH_MODAL_OPENED = "opened";
const SEARCH_MODAL_CLOSED = "closed";

let SEARCH_MODAL_STATE = SEARCH_MODAL_CLOSED;
let TOTAL_PAGE_RESULTS = 0;
let SEARCH_QUERY = "";

// this is used to store the total result counts,
// which includes all the sections and domains of all the pages.
let COUNT = 0;

// Declare `READTHEDOCS` to be a window property,
// if not present already.
if (!window.hasOwnProperty("READTHEDOCS")) {
    window.READTHEDOCS = {};
}

/**
 * Debounce the function.
 * Usage::
 *
 *    let func = debounce(() => console.log("Hello World"), 3000);
 *
 *    // calling the func
 *    func();
 *
 *    //cancelling the execution of the func (if not executed)
 *    func.cancel();
 *
 * @param {Function} func function to be debounced
 * @param {Number} wait time to wait before running func (in miliseconds)
 * @return {Function} debounced function
 */
function debounce(func, wait) {
    let timeout;

    let debounced = function() {
        let context = this;
        let args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };

    debounced.cancel = () => {
        clearTimeout(timeout);
        timeout = null;
    };

    return debounced;
}

/**
 * Take an object as parameter and convert it to
 * url params string.
 *
 * Eg. if ``obj = { 'a': 1, 'b': 2, 'c': ['hello', 'world'] }``, then it will return
 * the string ``a=1&b=2&c=hello,world``
 *
 * @param {Object} obj the object to be converted
 * @return {String|Array} object in url params form
 */
function convertObjToUrlParams(obj) {
    let params = Object.keys(obj).map(function(key) {
        if (_is_string(key)) {
            const s = key + "=" + encodeURI(obj[key]);
            return s;
        }
    });

    // removing empty strings from the 'params' array
    let final_params = [];
    for (let i = 0; i < params.length; ++i) {
        if (_is_string(params[i])) {
            final_params.push(params[i]);
        }
    }
    if (final_params.length === 1) {
        return final_params[0];
    } else {
        let final_url_params = final_params.join("&");
        return final_url_params;
    }
}

if (!READTHEDOCS.hasOwnProperty("updateUrl")) {
    /**
     * Adds/removes "rtd_search" url parameter to the url.
     */
    READTHEDOCS.updateUrl = function() {
        let origin = window.location.origin;
        let path = window.location.pathname;
        let url_params = $.getQueryParameters();
        let hash = window.location.hash;

        // SEARCH_QUERY should not be an empty string
        if (_is_string(SEARCH_QUERY)) {
            url_params.rtd_search = SEARCH_QUERY;
        } else {
            delete url_params.rtd_search;
        }

        let window_location_search = convertObjToUrlParams(url_params) + hash;

        // this happens during the tests,
        // when window.location.origin is "null" in Firefox
        // then correct URL is contained by window.location.pathname
        // which starts with "file://"
        let url = path + "?" + window_location_search;
        if (origin.substring(0, 4) === "http") {
            url = origin + url;
        }

        // update url
        window.history.pushState({}, null, url);
    };
}

/**
 * Create and return DOM nodes
 * with passed attributes.
 *
 * @param {String} nodeName name of the node
 * @param {Object} attributes obj of attributes to be assigned to the node
 * @return {Object} dom node with attributes
 */
function createDomNode(nodeName, attributes) {
    let node = document.createElement(nodeName);
    for (let attr in attributes) {
        node.setAttribute(attr, attributes[attr]);
    }
    return node;
}

/**
 * Checks if data type is "string" or not
 *
 * @param {*} data data whose data-type is to be checked
 * @return {Boolean} 'true' if type is "string" and length is > 0
 */
function _is_string(data) {
    if (typeof data === "string" && data.length > 0) {
        return true;
    } else {
        return false;
    }
}

/**
 * Checks if data type is a non-empty array
 * @param {*} data data whose type is to be checked
 * @return {Boolean} returns true if data is non-empty array, else returns false
 */
function _is_array(data) {
    if (Array.isArray(data) && data.length > 0) {
        return true;
    } else {
        return false;
    }
}

if (!READTHEDOCS.hasOwnProperty("get_section_html")) {
    /**
     * Generate and return html structure
     * for a page section result.
     *
     * @param {Object} sectionData object containing the result data
     * @param {String} page_link link of the main page. It is used to construct the section link
     */
    READTHEDOCS.get_section_html = function(sectionData, page_link) {
        let section_template =
            '<a href="<%= section_link %>"> \
            <div class="outer_div_page_results" id="<%= section_id %>"> \
                <span class="search__result__subheading"> \
                    <%= section_subheading %> \
                </span> \
                <% for (var i = 0; i < section_content.length; ++i) { %> \
                    <p class="search__result__content"> \
                        <%= section_content[i] %> \
                    </p> \
                <% } %>\
            </div> \
        </a> \
        <br class="br-for-hits">';

        let section_subheading = sectionData._source.title;
        let highlight = sectionData.highlight;
        if (READTHEDOCS.getHighlightListData(highlight, "sections.title")) {
            section_subheading = READTHEDOCS.getHighlightListData(
                highlight,
                "sections.title"
            )[0];
        }

        let section_content = [
            sectionData._source.content.substring(0, MAX_SUBSTRING_LIMIT) +
                " ..."
        ];

        if (READTHEDOCS.getHighlightListData(highlight, "sections.content")) {
            let highlight_content = READTHEDOCS.getHighlightListData(
                highlight,
                "sections.content"
            );
            section_content = [];
            for (
                let j = 0;
                j < highlight_content.length && j < MAX_SECTION_RESULTS;
                ++j
            ) {
                section_content.push("... " + highlight_content[j] + " ...");
            }
        }

        let section_link = `${page_link}#${sectionData._source.id}`;

        let section_id = "hit__" + COUNT;

        let section_html = $u.template(section_template, {
            section_link: section_link,
            section_id: section_id,
            section_subheading: section_subheading,
            section_content: section_content
        });

        return section_html;
    };
}

if (!READTHEDOCS.hasOwnProperty("getHighlightListData")) {
    /**
     * Returns value of the corresponding key (if present),
     * else returns false.
     *
     * @param {Object} data object containing the data used for highlighting
     * @param {String} key key whose values is to be returned
     * @return {Array|Boolean} if key is present, it will return its value. Otherwise, return false
     */
    READTHEDOCS.getHighlightListData = function(data, key) {
        if (_is_array(data[key])) {
            return data[key];
        } else {
            return false;
        }
    };
}

if (!READTHEDOCS.hasOwnProperty("get_domain_html")) {
    /**
     * Generate and return html structure
     * for a sphinx domain result.
     *
     * @param {Object} domainData object containing the result data
     * @param {String} page_link link of the main page. It is used to construct the section link
     */
    READTHEDOCS.get_domain_html = function(domainData, page_link) {
        let domain_template =
            '<a href="<%= domain_link %>"> \
            <div class="outer_div_page_results" id="<%= domain_id %>"> \
                <span class="search__result__subheading"> \
                    <%= domain_subheading %> \
                    <div class="search__domain_role_name"> \
                        <%= domain_role_name %> \
                    </div> \
                </span> \
                <p class="search__result__content"><%= domain_content %></p> \
            </div> \
        </a> \
        <br class="br-for-hits">';

        let domain_link = `${page_link}#${domainData._source.anchor}`;
        let domain_role_name = domainData._source.role_name;
        let domain_name = domainData._source.name;
        let domain_docstrings =
            domainData._source.docstrings.substr(0, MAX_SUBSTRING_LIMIT) +
            " ...";

        // take values from highlighted fields (if present)
        if (
            domainData.highlight !== undefined &&
            domainData.highlight !== null
        ) {
            let highlight = domainData.highlight;

            let name = READTHEDOCS.getHighlightListData(
                highlight,
                "domains.name"
            );
            let docstrings = READTHEDOCS.getHighlightListData(
                highlight,
                "domains.docstrings"
            );

            if (name) {
                domain_name = name[0];
            }

            if (docstrings) {
                domain_docstrings = docstrings[0];
            }
        }

        let domain_subheading = domain_name;
        let domain_content = domain_docstrings;
        let domain_id = "hit__" + COUNT;
        domain_role_name = "[" + domain_role_name + "]";

        let domain_html = $u.template(domain_template, {
            domain_link: domain_link,
            domain_id: domain_id,
            domain_content: domain_content,
            domain_subheading: domain_subheading,
            domain_role_name: domain_role_name
        });

        return domain_html;
    };
}

if (!READTHEDOCS.hasOwnProperty("generateSingleResult")) {
    /**
     * Generate search results for a single page.
     *
     * @param {Object} resultData search results of a page
     * @return {Object} a <div> node with the results of a single page
     */
    READTHEDOCS.generateSingleResult = function(resultData, projectName) {
        let content = createDomNode("div");

        let page_link_template =
            '<a href="<%= page_link %>"> \
                <h2 class="search__result__title"> \
                    <%= page_title %> \
                </h2> \
            </a>';

        let page_link = `${resultData.link}${DOCUMENTATION_OPTIONS.FILE_SUFFIX}`;
        let page_title = resultData.title;

        // if title is present in highlighted field, use that.
        if (
            resultData.highlight !== undefined &&
            resultData.highlight !== null
        ) {
            if (
                resultData.highlight.title !== undefined &&
                resultData.highlight.title !== null
            ) {
                page_title = resultData.highlight.title;
            }
        }

        // if result is not from the same project,
        // then it must be from subproject.
        if (projectName !== resultData.project) {
            page_title +=
                " " +
                $u.template(
                    '<small class="rtd_ui_search_subtitle"> \
                        (from project <%= project %>) \
                    </small>',
                    {
                        project: resultData.project
                    }
                );
        }

        page_title += "<br>";

        content.innerHTML += $u.template(page_link_template, {
            page_link: page_link,
            page_title: page_title
        });

        for (let i = 0; i < resultData.inner_hits.length; ++i) {
            const type = resultData.inner_hits[i].type;
            COUNT += 1;
            let html_structure = "";

            if (type === "sections") {
                html_structure = READTHEDOCS.get_section_html(
                    resultData.inner_hits[i],
                    page_link
                );
            } else if (type === "domains") {
                html_structure = READTHEDOCS.get_domain_html(
                    resultData.inner_hits[i],
                    page_link
                );
            }
            content.innerHTML += html_structure;
        }
        return content;
    };
}

if (!READTHEDOCS.hasOwnProperty("generateSuggestionsList")) {
    /**
     * Generate search suggestions list.
     *
     * @param {Object} data response data from the search backend
     * @param {String} projectName name (slug) of the project
     * @return {Object} a <div> node with class "search__result__box" with results
     */
    READTHEDOCS.generateSuggestionsList = function(data, projectName) {
        let search_result_box = createDomNode("div", {
            class: "search__result__box"
        });

        for (let i = 0; i < TOTAL_PAGE_RESULTS; ++i) {
            let search_result_single = createDomNode("div", {
                class: "search__result__single"
            });

            let content = READTHEDOCS.generateSingleResult(
                data.results[i],
                projectName
            );

            search_result_single.appendChild(content);
            search_result_box.appendChild(search_result_single);
        }
        return search_result_box;
    };
}

if (!READTHEDOCS.hasOwnProperty("removeAllActive")) {
    /**
     * Removes .active class from all the suggestions.
     */
    READTHEDOCS.removeAllActive = function() {
        const results = document.querySelectorAll(".outer_div_page_results");
        const results_arr = Object.keys(results).map(i => results[i]);
        for (let i = 1; i <= results_arr.length; ++i) {
            results_arr[i - 1].classList.remove("active");
        }
    };
}

if (!READTHEDOCS.hasOwnProperty("addActive")) {
    /**
     * Add .active class to the search suggestion
     * corresponding to serial number current_focus',
     * and scroll to that suggestion smoothly.
     *
     * @param {Number} current_focus serial no. of suggestions which will be active
     */
    READTHEDOCS.addActive = function(current_focus) {
        const current_item = document.querySelector("#hit__" + current_focus);
        // in case of no results or any error,
        // current_item will not be found in the DOM.
        if (current_item !== null) {
            current_item.classList.add("active");
            current_item.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "start"
            });
        }
    };
}

if (!READTHEDOCS.hasOwnProperty("getInputField")) {
    /**
     * Returns initial search input field,
     * which is already present in the docs.
     *
     * @return {Object} Input field node
     */
    READTHEDOCS.getInputField = function() {
        let inputField;

        // on search some pages (like search.html),
        // no div is present with role="search",
        // in that case, use the other query to select
        // the input field
        try {
            inputField = document.querySelector("div[role='search'] input");
            if (inputField === undefined || inputField === null) {
                throw "'div[role='search'] input' not found";
            }
        } catch (err) {
            inputField = document.querySelector("input[name='q']");
        }

        return inputField;
    };
}

if (!READTHEDOCS.hasOwnProperty("removeResults")) {
    /**
     * Removes all results from the search modal.
     * It doesn't close the search box.
     */
    READTHEDOCS.removeResults = function() {
        let all_results = document.querySelectorAll(".search__result__box");
        for (let i = 0; i < all_results.length; ++i) {
            all_results[i].parentElement.removeChild(all_results[i]);
        }
    };
}

if (!READTHEDOCS.hasOwnProperty("getErrorDiv")) {
    /**
     * Creates and returns a div with error message
     * and some styles.
     *
     * @param {String} err_msg error message to be displayed
     */
    READTHEDOCS.getErrorDiv = function(err_msg) {
        let err_div = createDomNode("div", {
            class: "search__result__box",
            style: "color: black; min-width: 300px; font-weight: 700"
        });
        err_div.innerHTML = err_msg;
        return err_div;
    };
}

if (!READTHEDOCS.hasOwnProperty("fetchAndGenerateResults")) {
    /**
     * Fetch the suggestions from search backend,
     * and appends the results to <div class="search__outer"> node,
     * which is already created when the page was loaded.
     *
     * @param {String} search_url url on which request will be sent
     * @param {String} projectName name (slug) of the project
     * @return {Function} debounced function with debounce time of 500ms
     */
    READTHEDOCS.fetchAndGenerateResults = function(search_url, projectName) {
        let search_outer = document.querySelector(".search__outer");

        // Removes all results (if there is any),
        // and show the "Searching ...." text to
        // the user.
        READTHEDOCS.removeResults();
        let search_loding = createDomNode("div", {
            class: "search__result__box"
        });
        search_loding.innerHTML = "<strong>Searching ....</strong>";
        search_outer.appendChild(search_loding);

        let ajaxFunc = () => {
            $.ajax({
                url: search_url,
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                },
                complete: (resp, status_code) => {
                    if (
                        status_code === "success" ||
                        typeof resp.responseJSON !== "undefined"
                    ) {
                        if (resp.responseJSON.results.length > 0) {
                            TOTAL_PAGE_RESULTS =
                                MAX_SUGGESTIONS <=
                                resp.responseJSON.results.length
                                    ? MAX_SUGGESTIONS
                                    : resp.responseJSON.results.length;
                            let search_result_box = READTHEDOCS.generateSuggestionsList(
                                resp.responseJSON,
                                projectName
                            );
                            READTHEDOCS.removeResults();
                            search_outer.appendChild(search_result_box);

                            // remove active classes from all suggestions
                            // if the mouse hovers, otherwise styles from
                            // :hover and .active will clash.
                            search_outer.addEventListener("mouseenter", e => {
                                READTHEDOCS.removeAllActive();
                            });
                        } else {
                            READTHEDOCS.removeResults();
                            let err_div = READTHEDOCS.getErrorDiv(
                                "No Results Found"
                            );
                            search_outer.appendChild(err_div);
                        }
                    }
                },
                error: (resp, status_code, error) => {
                    READTHEDOCS.removeResults();
                    let err_div = READTHEDOCS.getErrorDiv(
                        "Error Occurred. Please try again."
                    );
                    search_outer.appendChild(err_div);
                }
            });
        };
        ajaxFunc = debounce(ajaxFunc, 500);
        return ajaxFunc;
    };
}

if (!READTHEDOCS.hasOwnProperty("generateAndReturnInitialHtml")) {
    /**
     * Creates the initial html structure which will be
     * appended to the <body> as soon as the page loads.
     * This html structure will serve as the boilerplate
     * to show our search results.
     *
     * @return {String} initial html structure
     */
    READTHEDOCS.generateAndReturnInitialHtml = function() {
        let initialHtml =
            '<div class="search__outer__wrapper search__backdrop"> \
                <div class="search__outer"> \
                    <div class="search__cross" title="Close"> \
                        <!--?xml version="1.0" encoding="UTF-8"?--> \
                        <svg class="search__cross__img" width="15px" height="15px" enable-background="new 0 0 612 612" version="1.1" viewBox="0 0 612 612" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"> \
                            <polygon points="612 36.004 576.52 0.603 306 270.61 35.478 0.603 0 36.004 270.52 306.01 0 576 35.478 611.4 306 341.41 576.52 611.4 612 576 341.46 306.01"></polygon> \
                        </svg> \
                    </div> \
                    <input class="search__outer__input" placeholder="Search ..."> \
                    <span class="bar"></span> \
                </div> \
                <div class="rtd__search__credits"> \
                    Search by <a href="https://readthedocs.org/">Read the Docs</a> & <a href="https://readthedocs-sphinx-search.readthedocs.io/en/latest/">readthedocs-sphinx-search</a> \
                <div> \
            </div>';

        return initialHtml;
    };
}

if (!READTHEDOCS.hasOwnProperty("showSearchModal")) {
    /**
     * Opens the search modal.
     *
     * @param {String} custom_query if a custom query is provided, initialise the value of input field with it
     */
    READTHEDOCS.showSearchModal = function(custom_query) {
        // removes previous results (if there are any).
        READTHEDOCS.removeResults();

        SEARCH_MODAL_STATE = SEARCH_MODAL_OPENED;

        // removes the focus from the initial input field
        // which as already present in the docs.
        let search_bar = READTHEDOCS.getInputField();
        search_bar.blur();

        $(".search__outer__wrapper").fadeIn(400, () => {
            // sets the value of the input field to empty string and focus it.
            let search_outer_input = document.querySelector(
                ".search__outer__input"
            );
            if (search_outer_input !== null) {
                if (
                    typeof custom_query !== "undefined" &&
                    _is_string(custom_query)
                ) {
                    search_outer_input.value = custom_query;
                } else {
                    search_outer_input.value = "";
                }
                search_outer_input.focus();
            }
        });
    };
}

if (!READTHEDOCS.hasOwnProperty("removeSearchModal")) {
    /**
     * Closes the search modal.
     */
    READTHEDOCS.removeSearchModal = function() {
        // removes previous results before closing
        READTHEDOCS.removeResults();

        SEARCH_MODAL_STATE = SEARCH_MODAL_CLOSED;

        // sets the value of input field to empty string and remove the focus.
        let search_outer_input = document.querySelector(
            ".search__outer__input"
        );
        if (search_outer_input !== null) {
            search_outer_input.value = "";
            search_outer_input.blur();
        }

        // reset SEARCH_QUERY
        SEARCH_QUERY = "";

        // update url (remove 'rtd_search' param)
        READTHEDOCS.updateUrl();

        $(".search__outer__wrapper").fadeOut(400);
    };
}

window.addEventListener("DOMContentLoaded", evt => {
    // only add event listeners if READTHEDOCS_DATA global
    // variable is found.
    if (window.hasOwnProperty("READTHEDOCS_DATA")) {
        const project = READTHEDOCS_DATA.project;
        const version = READTHEDOCS_DATA.version;
        const language = READTHEDOCS_DATA.language || "en";
        const api_host = READTHEDOCS_DATA.api_host;

        let initialHtml = READTHEDOCS.generateAndReturnInitialHtml();
        document.body.innerHTML += initialHtml;

        let search_outer_wrapper = document.querySelector(
            ".search__outer__wrapper"
        );
        let search_outer_input = document.querySelector(
            ".search__outer__input"
        );
        let cross_icon = document.querySelector(".search__cross");

        // this denotes the search suggestion which is currently selected
        // via tha ArrowUp/ArrowDown keys.
        let current_focus = 0;

        // this stores the current request.
        let current_request = null;

        let search_bar = READTHEDOCS.getInputField();
        search_bar.addEventListener("focus", e => {
            READTHEDOCS.showSearchModal();
        });

        search_outer_input.addEventListener("input", e => {
            SEARCH_QUERY = e.target.value;
            COUNT = 0;

            let search_params = {
                q: SEARCH_QUERY,
                project: project,
                version: version,
                language: language
            };

            const search_url =
                api_host +
                "/api/v2/docsearch/?" +
                convertObjToUrlParams(search_params);

            if (typeof SEARCH_QUERY === "string" && SEARCH_QUERY.length > 0) {
                if (current_request !== null) {
                    // cancel previous ajax request.
                    current_request.cancel();
                }
                current_request = READTHEDOCS.fetchAndGenerateResults(
                    search_url,
                    project
                );
                current_request();
            } else {
                // if the last request returns the results,
                // the suggestions list is generated even if there
                // is no query. To prevent that, this function
                // is debounced here.
                debounce(READTHEDOCS.removeResults, 600)();
            }

            // update URL
            READTHEDOCS.updateUrl();
        });

        search_outer_input.addEventListener("keydown", e => {
            // if "ArrowDown is pressed"
            if (e.keyCode === 40) {
                e.preventDefault();
                current_focus += 1;
                if (current_focus > COUNT) {
                    current_focus = 1;
                }
                READTHEDOCS.removeAllActive();
                READTHEDOCS.addActive(current_focus);
            }

            // if "ArrowUp" is pressed.
            if (e.keyCode === 38) {
                e.preventDefault();
                current_focus -= 1;
                if (current_focus < 1) {
                    current_focus = COUNT;
                }
                READTHEDOCS.removeAllActive();
                READTHEDOCS.addActive(current_focus);
            }

            // if "Enter" key is pressed.
            if (e.keyCode === 13) {
                e.preventDefault();
                const current_item = document.querySelector(
                    ".outer_div_page_results.active"
                );
                // if an item is selected,
                // then redirect to its link
                if (current_item !== null) {
                    const link = current_item.parentElement["href"];
                    window.location.href = link;
                } else {
                    // submit search form if there
                    // is no active item.
                    const input_field = READTHEDOCS.getInputField();
                    const form = input_field.parentElement;

                    search_bar.value = SEARCH_QUERY || "";
                    form.submit();
                }
            }
        });

        search_outer_wrapper.addEventListener("click", e => {
            // HACK: only close the search modal if the
            // element clicked has <body> as the parent Node.
            // This is done so that search modal only gets closed
            // if the user clicks on the backdrop area.
            if (e.target.parentNode === document.body) {
                READTHEDOCS.removeSearchModal();
            }
        });

        // close the search modal if clicked on cross icon.
        cross_icon.addEventListener("click", e => {
            READTHEDOCS.removeSearchModal();
        });

        // close the search modal if the user pressed
        // Escape button
        document.addEventListener("keydown", e => {
            if (e.keyCode === 27) {
                READTHEDOCS.removeSearchModal();
            }
        });

        // open search modal if "forward slash" button is pressed
        document.addEventListener("keydown", e => {
            if (e.keyCode === 191) {
                if (SEARCH_MODAL_STATE !== SEARCH_MODAL_OPENED) {
                    READTHEDOCS.showSearchModal();
                }
            }
        });

        // if "rtd_search" is present in URL parameters,
        // then open the search modal and show the results
        // for the value of "rtd_search"
        let url_params = $.getQueryParameters();
        if (_is_array(url_params.rtd_search)) {
            let query = decodeURIComponent(url_params.rtd_search);
            READTHEDOCS.showSearchModal(query);
            search_outer_input.value = query;

            let event = document.createEvent("Event");
            event.initEvent("input", true, true);
            search_outer_input.dispatchEvent(event);
        }
    } else {
        console.log(
            "[INFO] Docs are not being served on Read the Docs, readthedocs-sphinx-search will not work."
        );
    }
});
