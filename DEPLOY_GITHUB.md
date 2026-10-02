# Deploy masarpstudio.com on GitHub Pages

## 1. Upload
Create a public GitHub repository and upload the **contents** of this folder to the repository root. `index.html` must be at the repository root.

## 2. Enable GitHub Pages
Repository → Settings → Pages → Deploy from a branch → choose the branch containing these files and `/ (root)`.

## 3. Set the custom domain
In Settings → Pages → Custom domain, enter:

`masarpstudio.com`

This package already includes a `CNAME` file with that value.

## 4. DNS for the apex domain
At your DNS provider create A records for `@` pointing to GitHub Pages:

- 185.199.108.153
- 185.199.109.153
- 185.199.110.153
- 185.199.111.153

For `www`, create a CNAME to your GitHub Pages default host such as `YOUR-GITHUB-USERNAME.github.io` (replace with your actual GitHub username; do not include a repository path).

Do not use a wildcard `*` DNS record for GitHub Pages.

## 5. HTTPS
After DNS resolves, enable **Enforce HTTPS** in GitHub Pages settings.

## 6. Verify
Check these URLs after deployment:

- https://masarpstudio.com/
- https://masarpstudio.com/rival-guys.html
- https://masarpstudio.com/play-rival-guys.html
- https://masarpstudio.com/robots.txt
- https://masarpstudio.com/sitemap.xml
- https://masarpstudio.com/favicon-48.png

DNS changes can take time to propagate.
