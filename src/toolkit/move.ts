import * as d3 from 'd3';
import { IEWChartProps } from '../../types';

function DrawCross(this: any, svg, config) {
  const svgEle = d3.select(svg);
  const { height } = config;
  let xcrossEle = svgEle.select('line.xcross');
  if (xcrossEle.empty()) {
    xcrossEle = svgEle
      .append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', height)
      .attr('stroke', 'red')
      .attr('stroke-dasharray', '3,3')
      .attr('class', 'xcross');
  }

  let ycrossEle = svgEle.select('g.ycross');
  if (ycrossEle.empty()) {
    ycrossEle = svgEle.append('g').attr('class', 'ycross');
    ycrossEle.append('path').attr('class', 'ycross_line').attr('stroke', 'red').attr('stroke-dasharray', '3,3');
    ycrossEle
      .append('text')
      .attr('class', 'ycross_text')
      .attr('stroke', 'none')
      .attr('fill', 'red')
      .attr('text-anchor', 'start');
  }

  this.xcrossEle = xcrossEle;
  this.ycrossEle = ycrossEle;
}

function MoveCross(this: any, cross, config, position, xAixs, yAixs) {
  const { left, right, width } = config;
  const ycross_line = cross.ycrossEle.select('path.ycross_line');
  const ycross_text = cross.ycrossEle.select('text.ycross_text');
  const path = d3.path();
  path.moveTo(left, position[1]);
  path.lineTo(width - right, position[1]);
  ycross_line.attr('d', path.toString());
  ycross_text.attr('y', position[1]).attr('x', left).text(yAixs.func.invert(position[1]).toFixed(2));

  const xm = xAixs.func.invert(position[0]); // 根据用户坐标获取svg坐标
  const xIndex = d3.bisectCenter(xAixs.data, xm); // 根据svg坐标获取最近点的索引
  const x = xAixs.func(xAixs.data[xIndex]); // 根据索引获取svg坐标值，进而获取用户坐标值
  cross.xcrossEle.attr('x1', x).attr('x2', x);

  this.xIndex = xIndex;
  this.x = x;
}

function DrawCircle(this: any, svg, moveCross, yAixs, data: IEWChartProps['data']) {
  const svgEle = d3.select(svg);
  const ys: Array<{ x: number; y: number; c: string | undefined; label: string; value: number | null }> = [];
  data.groups.forEach(group => {
    const value = group.values[moveCross.xIndex];
    const y = yAixs.func(value); // y坐标
    if (y !== undefined) {
      ys.push({
        x: moveCross.x,
        y,
        c: group.color,
        label: group.label,
        value,
      });
    }
  });

  const circles = svgEle.selectAll('.dot').data(ys);
  circles.attr('cx', moveCross.x).attr('cy', d => d.y);
  circles
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', moveCross.x)
    .attr('cy', d => d.y)
    .attr('r', 3.5)
    .attr('fill', 'none')
    .attr('stroke', d => d.c);

  circles.exit().remove();

  this.circles = svgEle.selectAll('.dot');
  this.points = ys;
}

export default function mouseMove(
  svg,
  config,
  data: IEWChartProps['data'],
  xAixs: { func: d3.ScaleTime<number, number, never>; data: Date[] },
  yAixs: { func: d3.ScaleTime<number, number, never> }
) {
  const svgEle = d3.select(svg);
  svgEle.style('-webkit-tap-highlight-color', 'transparent');
  if ('ontouchstart' in document) {
    svgEle.on('touchstart', entered).on('touchmove', moved).on('touchend', leaved);
  } else {
    svgEle.on('mouseenter', entered).on('mousemove', moved).on('mouseleave', leaved);
  }
  let cross;

  function entered() {
    cross = new DrawCross(svg, config);
    config.onMove && config.onMove('enter');
  }

  let drawCircle;
  function moved(event) {
    const position = d3.pointer(event);
    if (!cross) {
      cross = new DrawCross(svg, config);
    }
    const moveCross = new MoveCross(cross, config, position, xAixs, yAixs);
    drawCircle = new DrawCircle(svg, moveCross, yAixs, data);
    config.onMove && config.onMove('move', drawCircle.points, { x: position[0], y: position[1] });
  }

  function leaved() {
    cross.xcrossEle.remove();
    cross.ycrossEle.remove();
    drawCircle.circles.remove();
    config.onMove && config.onMove('leave');
  }

  return () => {
    svgEle.on('.');
  };
}
