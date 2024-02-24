// ==UserScript==
// @name         Merge All Job Posts Pagination
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Combine all paginated job posts into one page for any keyword, then sort.
// @author       YourName
// @match        https://www.51.ca/jobs/job-posts?keyword=*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // Helper function to get query parameters by name
    function getQueryParamByName(name, url = window.location.href) {
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    // Function to fetch content from each page
    function fetchContent(page, keyword) {
        return new Promise((resolve, reject) => {
            const url = `https://www.51.ca/jobs/job-posts?keyword=${encodeURIComponent(keyword)}&page=${page}`;
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response.responseText);
                    } else {
                        reject(new Error('Failed to load page ' + page));
                    }
                }
            });
        });
    }

    // Function to append fetched content
    function appendContent(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        const listItems = doc.querySelectorAll('#job-post > li');
        const targetUl = document.querySelector('#job-post');
        listItems.forEach(li => {
            const newLi = document.importNode(li, true);
            targetUl.appendChild(newLi);
        });
    }

    // Main function to initiate the process
    async function main() {
        const keyword = getQueryParamByName('keyword');
        if (!keyword) return; // Exit if no keyword is present in the URL

        const paginationDiv = document.querySelector('div[role="pagination"]');
        const totalPages = parseInt(paginationDiv.getAttribute('data-last-page'), 10);
        const fetchPromises = [];

        for (let page = 2; page <= totalPages; page++) {
            fetchPromises.push(fetchContent(page, keyword));
        }

        Promise.all(fetchPromises).then((pages) => {
            pages.forEach(page => appendContent(page));

            // After all content is appended, sort and re-append li items
            const listItemContainers = Array.from(document.querySelectorAll('#job-post > li'));
            const sortedListItemContainers = listItemContainers.sort((a, b) => {
                // Assuming sorting by data-id attribute; adjust if necessary
                return parseInt(b.querySelector('.job-item').getAttribute('data-id')) - parseInt(a.querySelector('.job-item').getAttribute('data-id'));
            });

            const targetUl = document.querySelector('#job-post');
            targetUl.innerHTML = ''; // Clear existing content
            sortedListItemContainers.forEach(li => targetUl.appendChild(li)); // Re-append sorted items
            console.log(listItemContainers);
        }).catch(error => console.error('Error fetching pages:', error));
    }

    main();
})();
