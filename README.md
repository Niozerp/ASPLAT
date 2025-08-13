# ASPLAT
Aush's Structured Prompt Library AI Toolkit. A handy single webpage tool for quickly accessing Generative AI Prompts. Made in Bootstrap 5 and Vue JS.

## Development

This project uses a simple templating system to share a common header and footer across all pages. To create a new page, follow these steps:

1.  Create a new HTML file (e.g., `newpage.html`).
2.  Add a placeholder for the header at the top of the file: `<div id="header-placeholder"></div>`.
3.  Add your page-specific HTML content.
4.  Add a placeholder for the footer at the bottom of the file: `<div id="footer-placeholder"></div>`.
5.  Add the main JavaScript file at the end of the file: `<script src="js/main.js"></script>`.

The `js/main.js` script will automatically fetch the content of `_header.html` and `_footer.html` and inject them into the placeholder divs.
