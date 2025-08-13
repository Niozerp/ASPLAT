document.addEventListener("DOMContentLoaded", async function() {
  try {
    // 1. Fetch and parse header

    const headerResponse = await fetch("/_header.html");

    if (!headerResponse.ok) throw new Error("Header fetch failed");
    const headerData = await headerResponse.text();
    const parser = new DOMParser();
    const headerDoc = parser.parseFromString(headerData, "text/html");

    // 2. Inject header CSS and other non-script tags
    Array.from(headerDoc.head.children).forEach(el => {
      if (el.tagName !== 'SCRIPT') {
        document.head.appendChild(el.cloneNode(true));
      }
    });
    document.getElementById("header-placeholder").innerHTML = headerDoc.body.innerHTML;

    // 3. Manually create, append, and wait for the Bootstrap script
    const bootstrapScript = headerDoc.querySelector('script[src*="bootstrap"]');
    if (bootstrapScript) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = bootstrapScript.src;
        script.integrity = bootstrapScript.integrity;
        script.crossOrigin = bootstrapScript.crossOrigin;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    // 4. Fetch and inject footer

    const footerResponse = await fetch("/_footer.html");

    if (!footerResponse.ok) throw new Error("Footer fetch failed");
    const footerData = await footerResponse.text();
    document.getElementById("footer-placeholder").innerHTML = footerData;

    // 5. Fire the layout loaded event
    console.log("Layout loaded successfully. Firing event.");
    document.dispatchEvent(new Event('layout-loaded'));

  } catch (error) {
    console.error("Failed to load layout:", error);
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = 'Error loading page layout. Please try again later.';
    document.body.appendChild(errorDiv);
  }
});
