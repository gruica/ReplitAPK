import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  canonical?: string;
}

export function SEO({
  title = "Frigo Sistem Todosijević - Profesionalni Servis Bele Tehnike | Kotor",
  description = "🔧 Profesionalni servis bele tehnike u Kotoru. ⚡ Brza dijagnostika, originalni delovi, 12 meseci garancije. Frižideri, veš mašine, sudopere. Pozovite 033 402 402 - dostupni 24/7!",
  keywords = "servis bele tehnike kotor, popravka frizidera, servis veš mašina, servis sudopera, tehničar bela tehnika, rezervni delovi, garancija popravka, hitni servis",
  ogTitle,
  ogDescription,
  ogImage = "https://www.tehnikamne.me/logo-frigo-sistem.webp",
  ogUrl = "https://www.tehnikamne.me/",
  canonical
}: SEOProps) {
  useEffect(() => {
    document.title = title;
    
    const metaTags = [
      { name: 'description', content: description },
      { name: 'keywords', content: keywords },
      { property: 'og:title', content: ogTitle || title },
      { property: 'og:description', content: ogDescription || description },
      { property: 'og:image', content: ogImage },
      { property: 'og:url', content: ogUrl },
      { name: 'twitter:title', content: ogTitle || title },
      { name: 'twitter:description', content: ogDescription || description },
      { name: 'twitter:image', content: ogImage },
    ];

    metaTags.forEach(({ name, property, content }) => {
      const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
      let element = document.querySelector(selector) as HTMLMetaElement;
      
      if (element) {
        element.content = content;
      } else {
        element = document.createElement('meta');
        if (name) element.name = name;
        if (property) element.setAttribute('property', property);
        element.content = content;
        document.head.appendChild(element);
      }
    });

    if (canonical) {
      let linkElement = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (linkElement) {
        linkElement.href = canonical;
      } else {
        linkElement = document.createElement('link');
        linkElement.rel = 'canonical';
        linkElement.href = canonical;
        document.head.appendChild(linkElement);
      }
    }
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogUrl, canonical]);

  return null;
}
