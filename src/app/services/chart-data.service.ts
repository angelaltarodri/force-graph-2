import { Injectable, inject } from '@angular/core';
import { BaseType, Link, Node, Selection, Simulation, drag, forceLink, forceManyBody, forceSimulation, select } from 'd3';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { CHART_OPTIONS } from '../data/chart-options';
import { formFields } from '../data/form-fields';
import { ColorTypes } from '../enums/color-type.enum';
import { Person } from '../interfaces/person.interface';
import { BreakpointService } from './breakpoint.service';

@Injectable({
  providedIn: 'root',
})
export class ChartDataService {
  private persons: Person[] = [];
  public personsSubject: BehaviorSubject<Person[]> = new BehaviorSubject<Person[]>([]);
  public numberFilter: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  private breakpointService = inject(BreakpointService);
  public proportion = 1;

  addPerson(form: { [key: string]: any }): void {
    const name: string = `Person${this.persons.length + 1}`;
    const id = this.persons.length;

    const person: Person = { name, id, ...form };

    this.persons.push(person);
    this.personsSubject.next(this.persons);
  }

  constructor() {
    this.proportion = this.breakpointService.proportion.getValue();
  }

  /**
   * Generate Chart Data
   * @returns nodes and links using the persons data from the BehaviorSubject
   */
  public getChartData(): Observable<{ nodes: Node[]; links: Link[] }> {
    const nodes: Node[] = [];
    const links: Link[] = [];

    /**
     * the purpose of formFieldsCounter is to acumulate the repeated nodes, so that later
     * we can identify which ones are the most repeated and assign them high values
     * in order to make bigger circles/ highlight them.
     *
     * Also, we only see on the graph the field values that were chosen by the user
     * (or the algorithm).
     */

    const formFieldsCounter = {};

    for (let i = 0; i < this.persons.length; i++) {
      for (let j = 0; j < formFields.length; j++) {
        for (let k = 0; k < formFields[j].options.length; k++) {
          if (this.persons[i][formFields[j].field] === formFields[j].options[k].id) {
            if (formFields[j].options[k].id in formFieldsCounter) {
              formFieldsCounter[formFields[j].options[k].id].counter += 1;
            } else {
              formFieldsCounter[formFields[j].options[k].id] = {
                id: formFields[j].options[k].id,
                parent: formFields[j].id,
                name: formFields[j].options[k].name,
                counter: 1,
              };
            }
          }
        }
      }
    }

    const formFieldParents = [];

    for (const item in formFieldsCounter) {
      if (Object.prototype.hasOwnProperty.call(formFieldsCounter, item)) {
        const counter = formFieldsCounter[item].counter;

        if (counter >= this.numberFilter.getValue()) {
          nodes.push({
            id: formFieldsCounter[item].id,
            name: formFieldsCounter[item].name,
            color: ColorTypes.PURPLE,
            value: counter * 5 + 5,
            counter: counter,
          });

          formFieldParents.push(formFieldsCounter[item].parent);
        }
      }
    }

    for (let i = 0; i < this.persons.length; i++) {
      for (let j = 0; j < formFields.length; j++) {
        for (let k = 0; k < formFields[j].options.length; k++) {
          if (this.persons[i][formFields[j].field] === formFields[j].options[k].id) {
            const counter = formFieldsCounter[formFields[j].options[k].id].counter;

            if (counter >= this.numberFilter.getValue()) {
              links.push({
                source: this.persons[i].id,
                target: formFields[j].options[k].id,
                light: true,
              });

              const value = counter * 5 + 5;
              links.push({
                source: this.persons[i].id,
                target: formFields[j].options[k].id,
                light: true,
                name: formFieldsCounter[formFields[j].options[k].id].name,
                value,
              });

              links.push({
                source: formFields[j].options[k].id,
                target: formFields[j].id,
                light: false,
              });
            }
          }
        }

        const isPresent = formFieldParents.find((p) => p === formFields[j].id);

        if (i === 0 && isPresent) {
          nodes.push({
            id: formFields[j].id,
            name: formFields[j].name,
            color: ColorTypes.INDIANRED,
            value: 20 * this.proportion,
          });
        }
      }
      const newPersonNode = {
        id: this.persons[i].id,
        name: this.persons[i].name,
        color: ColorTypes.ORANGE,
        value: 20 * this.proportion,
      };
      nodes.push(newPersonNode);
    }

    return of({ nodes, links });
  }

  /**
   * Create Graph & Adjust SVG Height,Width & View Box
   */
  public createGraph(
    div: HTMLDivElement,
    width: number,
    height: number,
    data: any,
  ): { svg: Selection<SVGSVGElement, unknown, null, undefined>; simulation: Simulation<Node, Link> } {
    select('svg').remove();

    const svg = select(div).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');

    const link: Selection<SVGLineElement, Link, BaseType, unknown> = svg
      .append('g')
      .attr('stroke', CHART_OPTIONS.linkColor)
      .attr('stroke-opacity', 1)
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('class', 'links');

    const bright = svg
      .append('defs')
      .append('radialGradient')
      .attr('fill', CHART_OPTIONS.linkColor)
      .attr('id', `glare-gradient`)
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    bright.append('stop').attr('offset', '0%').style('stop-color', 'white').style('stop-opacity', 1);

    bright.append('stop').attr('offset', '50%').style('stop-color', CHART_OPTIONS.gradientShade);

    const node: Selection<SVGGElement, Node, BaseType, unknown> = svg
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .call(
        drag()
          .on('start', (e, d, s) => {
            this.dragStart(e, d, simulation);
            link
              .attr('display', 'none')
              .filter((l) => l.source.id === d.id || l.target.id === d.id)
              .attr('display', 'block')
              .attr('stroke', 'white');
          })
          .on('drag', (e, d, s) => {
            this.drag(e, d, simulation);
            link
              .attr('display', 'none')
              .filter((l) => l.source.id === d.id || l.target.id === d.id)
              .attr('display', 'block')
              .attr('stroke', 'white');
          })
          .on('end', (e, d, s) => {
            this.dragEnd(e, d, simulation);
            link.attr('display', 'block').attr('stroke', CHART_OPTIONS.linkColor);
          }),
      );

    const circles: Selection<SVGCircleElement, Node, BaseType, unknown> = node.append('g').style('cursor', 'pointer');

    circles
      .append('circle')
      .attr('r', (d) => d.value)
      .style('fill', (d) => d.color);

    const gradient: Selection<SVGStopElement, unknown, BaseType, unknown> = circles
      .append('radialGradient')
      .attr('id', (d, i) => `glare-gradient-${i}`)
      .attr('cx', '70%')
      .attr('cy', '70%')
      .attr('r', '80%');

    gradient.append('stop').attr('offset', '0%').style('stop-color', CHART_OPTIONS.gradientColor).style('stop-opacity', 1);

    gradient.append('stop').attr('offset', '100%').style('stop-color', CHART_OPTIONS.gradientShade);

    circles
      .append('circle')
      .attr('r', (d) => d.value)
      .attr('x', 0)
      .attr('y', 0)
      .style('fill', (d, i) => `url(#glare-gradient-${i})`);

    circles
      .append('text')
      .style('fill', (d) => 'white')
      .text((n) => `${n.name}${n.counter ? '(' + n.counter + ')' : ''}`)
      .attr('x', 12)
      .attr('y', 3)
      .style('font-size', '12px');

    const light = svg
      .append('g')
      .attr('stroke', 'transparent')
      .attr('stroke-opacity', 1)
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('class', 'links')
      .attr('marker-end', (d, i) => {
        const urlId = this.createMarker(svg, d, i);

        return d.light && d.value ? urlId : '';
      });

    svg.select('#light-gradient').attr('refX', 5);

    const simulation = forceSimulation(data.nodes)
      .force(
        'link',
        forceLink<Node, Link>(data.links).id((d) => d.id),
      )
      .force('charge', forceManyBody<Node>().strength(-300))
      .on('tick', () => {
        node.attr('transform', (n) => {
          n.x = Math.max(0, Math.min(width, n.x));
          n.y = Math.max(0, Math.min(height, n.y));
          return 'translate(' + n.x + ',' + n.y + ')';
        });
        link
          .attr('x1', (l) => {
            return l.source.x;
          })
          .attr('y1', (l) => l.source.y)
          .attr('x2', (l) => l.target.x)
          .attr('y2', (l) => l.target.y);
        light
          .attr('x1', (l) => {
            return l.source.x;
          })
          .attr('y1', (l) => l.source.y)
          .attr('x2', (l) => l.target.x)
          .attr('y2', (l) => l.target.y);
      });

    return { svg, simulation };
  }

  private dragStart(e: DragEvent, d: Node, simulation) {
    simulation.alphaTarget(0.05).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  private drag(e: DragEvent, d: Node, simulation) {
    d.fx = e.x;
    d.fy = e.y;
  }

  private dragEnd(e: DragEvent, d: Node, simulation) {
    simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  private createMarker(svg, d, i): string {
    const markerId = `custom-marker-${i}`;
    svg
      .select('defs')
      .append('marker')
      .attr('id', markerId)
      .attr('viewBox', '-5 -5 10 10')
      .attr('refX', d.value ? d.value / 2 : 0)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 20)
      .attr('markerHeight', 20)
      .attr('xoverflow', 'visible')
      .append('svg:circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', 'url(#glare-gradient)')
      .style('stroke', 'none');

    return `url(#${markerId})`;
  }
}
