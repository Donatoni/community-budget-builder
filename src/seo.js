import { PROPOSED_TOTAL, fmtM } from './budget.js';
import { ALL_COST_CENTERS } from './cost-centers.js';

export const seo = {
  url: 'https://amendment-3.delandfl.gov/',
  name: 'Build Your DeLand',
  title: 'DeLand Budget Builder | Florida Amendment 3 (2026)',
  description: 'Florida voters approved Amendment 3 in 2026. See how it affects the City of DeLand’s budget and explore service trade-offs in an interactive budget exercise.',
  reviewed: '2026-11-24',
  image: '/assets/deland-explore-options-social.jpg',
  imageAlt: 'DeLand in large white letters over a sunset photo of the historic Volusia County Courthouse and a brick street lined with lampposts and palm trees. Text reads: Explore options and service priorities.',
};

// These answers generate both visible HTML and structured data at build time.
export const faqs = [
  {
    question: 'What is Florida Amendment 3 in 2026?',
    answer: 'It is a change to homestead exemptions and non-homestead assessment limits that Florida voters approved on the November 3, 2026 ballot. It required at least 60% voter approval to pass. The first changes take effect in 2027.',
  },
  {
    question: 'Does Amendment 3 eliminate my entire property tax bill?',
    answer: 'No. The larger homestead exemption applies to non-school property taxes. School taxes and non-ad valorem assessments can still apply. A larger exemption also does not guarantee that future tax rates will stay the same.',
  },
  {
    question: 'Does this tool show DeLand’s entire city budget?',
    answer: `No. This exercise offers ${ALL_COST_CENTERS.length} service choices across five departments with ${fmtM(PROPOSED_TOTAL)} in net FY 2026/27 costs. It uses the workbook’s Cost Center - Everything figures, including existing revenue offsets, and combines three sports facilities into one choice. Close the $5.2 million planning gap with service cuts, potential revenue, or both. The full city budget includes other funds and activities; consult the city’s published budget documents for the complete picture.`,
  },

];

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function siteURL(value = '') {
  if (!value.trim()) return null;
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
    || url.pathname !== '/' || url.hostname === 'localhost' || !url.hostname.includes('.')) {
    throw new Error('SITE_URL must be the public HTTPS origin, with no path, credentials, query, or fragment.');
  }
  return url.origin + '/';
}

export function structuredData(url) {
  const pageId = url ? `${url}#webpage` : '#webpage';
  const siteId = url ? `${url}#website` : '#website';
  const publisherId = 'https://www.deland.org/#government';
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'GovernmentOrganization', '@id': publisherId,
        name: 'City of DeLand', url: 'https://www.deland.org/',
        address: { '@type': 'PostalAddress', streetAddress: '120 S Florida Avenue', addressLocality: 'DeLand', addressRegion: 'FL', postalCode: '32720', addressCountry: 'US' },
      },
      {
        '@type': 'WebSite', '@id': siteId, name: seo.name,
        ...(url && { url }), inLanguage: 'en-US', publisher: { '@id': publisherId },
      },
      {
        '@type': ['WebPage', 'FAQPage'], '@id': pageId, name: seo.title,
        ...(url && { url, primaryImageOfPage: { '@type': 'ImageObject', url: new URL(seo.image, url).href, width: 1200, height: 630 } }),
        description: seo.description, inLanguage: 'en-US', dateModified: seo.reviewed,
        isPartOf: { '@id': siteId }, publisher: { '@id': publisherId },
        spatialCoverage: { '@type': 'Place', name: 'DeLand, Florida' },
        mainEntity: faqs.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
      },
    ],
  };
}

export function renderHead(url, indexable) {
  const meta = (key, content, property = false) => `<meta ${property ? 'property' : 'name'}="${key}" content="${escapeHTML(content)}" />`;
  return [
    `<title>${escapeHTML(seo.title)}</title>`,
    meta('description', seo.description),
    meta('robots', indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'),
    ...(url ? [`<link rel="canonical" href="${escapeHTML(url)}" />`, meta('og:url', url, true)] : []),
    meta('og:type', 'website', true), meta('og:locale', 'en_US', true), meta('og:site_name', seo.name, true),
    meta('og:title', seo.title, true), meta('og:description', seo.description, true),
    meta('twitter:card', 'summary_large_image'), meta('twitter:title', seo.title), meta('twitter:description', seo.description),
    ...(url ? [meta('og:image', new URL(seo.image, url).href, true), meta('og:image:width', '1200', true), meta('og:image:height', '630', true), meta('og:image:type', 'image/jpeg', true), meta('og:image:alt', seo.imageAlt, true), meta('twitter:image', new URL(seo.image, url).href), meta('twitter:image:alt', seo.imageAlt)] : []),
    `<script type="application/ld+json">${JSON.stringify(structuredData(url)).replace(/</g, '\\u003c')}</script>`,
  ].join('\n  ');
}

export function renderResources() {
  return `<section class="faq-section" id="faq" aria-labelledby="faq-title">
      <div class="section-shell resources-layout">
        <div class="resources-intro">
          <p class="eyebrow">Questions, answered</p>
          <h2 id="faq-title">DeLand budget &amp; property tax FAQs</h2>
          <p>Understand the amendment and how to use this budget exercise.</p>
          <a href="#sources">Check the sources below</a>
        </div>
        <div class="faq-list">
          ${faqs.map(item => `<details><summary>${escapeHTML(item.question)}</summary><div class="faq-answer"><p>${escapeHTML(item.answer)}</p></div></details>`).join('\n          ')}
        </div>
      </div>
    </section>
    <section class="sources-section" id="sources" aria-labelledby="sources-title">
      <div class="section-shell">
        <div class="section-heading split">
          <div><p class="eyebrow">Behind the numbers</p><h2 id="sources-title">Sources &amp; official references</h2></div>
          <p>Follow the numbers back to their source with these official references.</p>
        </div>
        <div class="sources-grid">
          <div class="source-directory" aria-labelledby="official-sources-title">
            <div class="source-directory-heading"><h3 id="official-sources-title">Explore the official sources</h3></div>
            <ul class="source-links">
              <li><a target="_blank" rel="noopener noreferrer" href="https://vcpa.vcgov.org/info/amendment3"><span class="source-link-copy"><strong>Amendment 3 &amp; eligibility</strong><small>Volusia County Property Appraiser</small></span><span class="source-link-arrow" aria-hidden="true">↗</span></a></li>
              <li><a target="_blank" rel="noopener noreferrer" href="https://vcpa.vcgov.org/search/real-property"><span class="source-link-copy"><strong>Property records &amp; assessed values</strong><small>Volusia County Property Appraiser</small></span><span class="source-link-arrow" aria-hidden="true">↗</span></a></li>
              <li><a target="_blank" rel="noopener noreferrer" href="https://www.deland.org/283/Annual-Budget"><span class="source-link-copy"><strong>Proposed &amp; adopted annual budgets</strong><small>City of DeLand</small></span><span class="source-link-arrow" aria-hidden="true">↗</span></a></li>
              <li><a target="_blank" rel="noopener noreferrer" href="https://www.deland.org/367/Millage-Rate"><span class="source-link-copy"><strong>Millage rate resolutions</strong><small>City of DeLand</small></span><span class="source-link-arrow" aria-hidden="true">↗</span></a></li>
              <li><a target="_blank" rel="noopener noreferrer" href="https://floridarevenue.com/property/Pages/Taxpayers_Exemptions.aspx"><span class="source-link-copy"><strong>Homestead exemptions</strong><small>Florida Department of Revenue</small></span><span class="source-link-arrow" aria-hidden="true">↗</span></a></li>
            </ul>
            <p class="source-reviewed">Amendment information reviewed <time datetime="${seo.reviewed}">November 24, 2026</time>. Check the linked agencies for updates.</p>
          </div>
        </div>
      </div>
    </section>`;
}

export function renderPage(html, url, indexable) {
  return html.replace('<!-- seo:head -->', renderHead(url, indexable))
    .replace('<!-- seo:resources -->', renderResources());
}

export function renderSitemap(url) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeHTML(url)}</loc><lastmod>${seo.reviewed}</lastmod></url></urlset>\n`;
}

export function renderRobots(url, indexable) {
  // Let crawlers read the noindex directive on preview HTML; do not disallow it.
  return `User-agent: *\nAllow: /\n${url && indexable ? `\nSitemap: ${new URL('sitemap.xml', url).href}\n` : ''}`;
}
