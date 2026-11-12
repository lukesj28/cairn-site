import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import './docs.css';
import github from '@phosphor-icons/core/bold/github-logo-bold.svg?raw';

for (const el of document.querySelectorAll('[data-icon="github"]')) el.innerHTML = github;
