import React from 'react';

interface ParsedElement {
  type: 'text' | 'bold' | 'italic' | 'code';
  content: string;
}

export function parseMarkdown(text: string): ParsedElement[] {
  const elements: ParsedElement[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    // Look for markdown patterns
    const remaining = text.slice(currentIndex);
    
    // Check for code blocks first (highest priority)
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      elements.push({
        type: 'code',
        content: codeMatch[1]
      });
      currentIndex += codeMatch[0].length;
      continue;
    }

    // Check for bold text
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      elements.push({
        type: 'bold',
        content: boldMatch[1]
      });
      currentIndex += boldMatch[0].length;
      continue;
    }

    // Check for italic text
    const italicMatch = remaining.match(/^_([^_]+)_/);
    if (italicMatch) {
      elements.push({
        type: 'italic',
        content: italicMatch[1]
      });
      currentIndex += italicMatch[0].length;
      continue;
    }

    // No markdown found, add regular text
    let nextMarkdownIndex = text.length;
    
    // Find the next markdown symbol
    const nextBold = text.indexOf('**', currentIndex);
    const nextItalic = text.indexOf('_', currentIndex);
    const nextCode = text.indexOf('`', currentIndex);
    
    if (nextBold !== -1) nextMarkdownIndex = Math.min(nextMarkdownIndex, nextBold);
    if (nextItalic !== -1) nextMarkdownIndex = Math.min(nextMarkdownIndex, nextItalic);
    if (nextCode !== -1) nextMarkdownIndex = Math.min(nextMarkdownIndex, nextCode);

    if (nextMarkdownIndex > currentIndex) {
      elements.push({
        type: 'text',
        content: text.slice(currentIndex, nextMarkdownIndex)
      });
      currentIndex = nextMarkdownIndex;
    } else {
      // If we can't find any markdown, add the remaining text and break
      elements.push({
        type: 'text',
        content: text.slice(currentIndex)
      });
      break;
    }
  }

  return elements;
}

export function renderMarkdown(text: string): React.ReactElement {
  const elements = parseMarkdown(text);
  
  return React.createElement(
    React.Fragment,
    null,
    ...elements.map((element, index) => {
      switch (element.type) {
        case 'bold':
          return React.createElement('strong', { key: index, className: 'font-semibold' }, element.content);
        case 'italic':
          return React.createElement('em', { key: index, className: 'italic' }, element.content);
        case 'code':
          return React.createElement(
            'code',
            { 
              key: index, 
              className: 'bg-zinc-800 text-zinc-300 px-1 py-0.5 rounded text-sm font-mono'
            },
            element.content
          );
        case 'text':
        default:
          return React.createElement('span', { key: index }, element.content);
      }
    })
  );
} 