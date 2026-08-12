import React, { useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ScrollReveal.css';

gsap.registerPlugin(ScrollTrigger);

export default function ScrollReveal({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = '',
  textClassName = '',
  rotationEnd = 'bottom bottom',
  wordAnimationEnd = 'bottom 40%',
}) {
  const containerRef = useRef(null);

  const splitTextIntoWords = (node) => {
    if (typeof node === 'string') {
      const words = node.split(/\s+/).filter(Boolean);
      return words.map((word, idx) => (
        <span
          key={idx}
          className={`scroll-reveal-word ${textClassName}`}
          style={{ display: 'inline-block', marginRight: '0.3em', willChange: 'opacity, filter, transform' }}
        >
          {word}
        </span>
      ));
    }

    if (React.isValidElement(node)) {
      if (typeof node.props.children === 'string') {
        const words = node.props.children.split(/\s+/).filter(Boolean);
        return React.cloneElement(node, {
          ...node.props,
          children: words.map((word, idx) => (
            <span
              key={idx}
              className={`scroll-reveal-word ${textClassName}`}
              style={{ display: 'inline-block', marginRight: '0.3em', willChange: 'opacity, filter, transform' }}
            >
              {word}
            </span>
          )),
        });
      }

      if (Array.isArray(node.props.children)) {
        return React.cloneElement(node, {
          ...node.props,
          children: React.Children.map(node.props.children, splitTextIntoWords),
        });
      }
    }

    return node;
  };

  const processedChildren = useMemo(() => {
    return React.Children.map(children, splitTextIntoWords);
  }, [children, textClassName]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scroller =
      scrollContainerRef && scrollContainerRef.current
        ? scrollContainerRef.current
        : window;

    const words = el.querySelectorAll('.scroll-reveal-word');

    const ctx = gsap.context(() => {
      if (words.length > 0) {
        gsap.fromTo(
          words,
          {
            opacity: baseOpacity,
            filter: enableBlur ? `blur(${blurStrength}px)` : 'none',
            y: baseRotation ? 15 : 0,
            rotation: baseRotation || 0,
          },
          {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            rotation: 0,
            stagger: 0.05,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              scroller,
              start: 'top 85%',
              end: wordAnimationEnd,
              scrub: 1,
            },
          }
        );
      }
    }, el);

    return () => ctx.revert();
  }, [
    scrollContainerRef,
    enableBlur,
    baseOpacity,
    baseRotation,
    blurStrength,
    rotationEnd,
    wordAnimationEnd,
    children,
  ]);

  return (
    <div ref={containerRef} className={`scroll-reveal-container ${containerClassName}`}>
      {processedChildren}
    </div>
  );
}
