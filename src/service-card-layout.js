// Equalize only each row's main content. Impact footers keep their own height.
export function initServiceCardLayout(grid) {
  const bodies = [...grid.querySelectorAll('.svc-body')];
  const naturalParts = bodies.map(body => [...body.children]);
  const px = value => Number.parseFloat(value) || 0;

  function align() {
    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    if (columns === 1) {
      bodies.forEach(body => body.style.removeProperty('--svc-body-height'));
      return;
    }
    const heights = bodies.map((body, index) => {
      const style = getComputedStyle(body);
      return px(style.paddingTop) + px(style.paddingBottom)
        + naturalParts[index].reduce((total, part) => {
          const partStyle = getComputedStyle(part);
          // The track's auto margin is the flexible space we are setting,
          // so it must not contribute to the measured natural height.
          const top = part.classList.contains('svc-track') ? 0 : px(partStyle.marginTop);
          return total + part.getBoundingClientRect().height + top + px(partStyle.marginBottom);
        }, 0);
    });
    for (let start = 0; start < bodies.length; start += columns) {
      const height = Math.max(...heights.slice(start, start + columns));
      bodies.slice(start, start + columns).forEach(body => {
        body.style.setProperty('--svc-body-height', `${height}px`);
      });
    }
  }

  // These children keep their natural height; observing them avoids a loop
  // when the body's minimum height changes or an impact footer animates.
  const observer = new ResizeObserver(align);
  naturalParts.flat().forEach(part => observer.observe(part));
  align();
  import.meta.hot?.dispose(() => observer.disconnect());
}
