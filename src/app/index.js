import React, { Component } from 'react';
import { render } from 'react-dom';
import { json } from 'd3-fetch';
import { scaleOrdinal } from 'd3-scale';
import { select, selectAll, event } from 'd3-selection';
import { treemap, hierarchy, treemapResquarify } from 'd3-hierarchy';
import { interpolateRgb } from 'd3-interpolate';
import { schemePaired } from 'd3-scale-chromatic';
import { format } from 'd3-format';
import { transition } from 'd3-transition';

// IMPORTANT! IMPORT THIS SO WEBPACK CREATES A FILE IN DOCS FOLDER
// THIS IS WHERE fetchData LOOKS FOR LOCALLY
import './helper/sample.json';
import './helper/flare.json';
// console.log({sampleData});

import './styles/main.scss';

const GAMES = 'https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/kickstarter-funding-data.json';
const MOVIES = 'https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/movie-data.json';
const KICKSTARTERS = 'https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/kickstarter-funding-data.json';

class Treemap extends Component {
  constructor(props) {
    super(props)
    this.state = {
       gamesData: [],
       moviesData: [],
       kickstartersData: [],
       h: 600,
       w: 1200,
       p: 50,
    };
    this.createTreemap = this.createTreemap.bind(this);
    this.fetchData = this.fetchData.bind(this);
  };
  
  componentDidMount() {
    console.log('component mounted!');
    // console.log({sampleData})
    // this.fetchData('./json/sample.json');
    this.fetchData('./json/flare.json');
    // this.fetchData(GAMES);
    // this.fetchData(MOVIES);
    // this.fetchData(KICKSTARTERS);
  };

  componentDidUpdate() {
    console.log('state updated: ', this.state);
    if (this.state.data.hasOwnProperty('name')) { // kapag may laman na ang data
      this.createTreemap(this.state.data);
    }
  };

  fetchData(address) {
    json(address, (error, data) => {
      if(error) throw error; 
    })
      .then(data => this.setState({ data }));
  }

  createTreemap(data) {
    console.log('creating treemap...')
    const node = this.node,
    // habang lumalapit sa 1, pa-white nang pa-white 'yung fadedSchemePaired, who'dathunk?
          fadedSchemePaired = schemePaired.map(clr => interpolateRgb(clr, 'white')(0.5)),
    // console.log({fadedSchemePaired});
          color = scaleOrdinal(fadedSchemePaired),
          sumBySize = d => d.size, // size ay property ng data na nasa flare.json
          sumByCount = d => (d.children ? 0 : 1);
          // kung may children ang current node, 0 returned value

    const rootNode = hierarchy(data)
    .eachBefore(d => {
      // analyze this algo.. hmmm
      d.data.id = (d.parent ? d.parent.data.id + '.' : '') + d.data.name
      // d.data.id is an entirely new key-value pair for each d (from data)
      // looks like a deep object call towards the leaf element of the data hierarchy
    })
      .sum(sumBySize)
      .sort((a,b) => (
        b.height - a.height || b.value - a.value
      ))

    // console.log('rootNode before: ', rootNode.leaves());

    let treemapity = treemap()
      .tile(treemapResquarify) // default is d3.treemapResquarify, uses the golden ratio square format
      .size([this.state.w, this.state.h])
      .round(true) // NOTE: test what happens if not true
      .paddingInner(1) // NOTE: test what happens if not 1
    
    treemapity(rootNode);
    // console.log(treemap(rootNode));
    // console.log('rootNode.leaves(): ', rootNode.leaves());
    // console.log('rootNode: ', rootNode);

    let parentsArrayGetter = (id) => {
      // console.log('dataArray: ', id.match(/([a-z]+)(?=\.)/g));
      return (id.match(/([a-z]+)(?=\.)/g));
    };

    let tooltipHtml = (ancestorsArray, name, value) => {
      let ancestring = '', generation = ancestorsArray.length;
      for (let i of ancestorsArray.reverse()) {
        generation--;
        ancestring += 'Gen ' + generation + ':\t' + i + '<br/>';
      }
      return 'Leaf:\t' + name + '<br/><br/>' + ancestring + '<br/>size:\t' + value;
    };

    const tooltip = select('#tooltip');

    const handleMouseover = (d) => {
      let name = d.data.name.split(/(?=[A-Z][^A-Z])/g).join(' ');
      let id = d.data.id;
      let val = format(',d')(d.data.size);
      let ancestorsArray = parentsArrayGetter(id);
      
      tooltip.transition()
        .duration(100)
        .style('opacity', 0.9)
        .style('transform', 'scale(1) translate(-50px, -118px)')
        .style('stroke', 'lightslategray')
      tooltip.html(tooltipHtml(ancestorsArray, name, val))
    };
    const handleMouseMove = () => {
      tooltip.style('top', `${event.pageY}`)
        .style('left', event.pageX)
    };
    const handleMouseOut = () => {
      tooltip.transition()
        .duration(100)
        .style('opacity', 0)
        .style('transform', 'scale(0)')
        .style('stroke', 'none')
    };

    select(node).selectAll('g')
      .attr('id', 'cell')
      .data(rootNode.leaves())
      .enter().append('g')
        .attr('class', 'group')
        // itong ang magppwesto ng leaves sa dapat nilang kalagyan
        .attr('transform', d => `translate(${d.x0}, ${d.y0})`)
          .append('rect')
          .attr('id', d => d.data.id)
          .attr('width', d => d.x1 - d.x0)
          .attr('height', d => d.y1 - d.y0)
          .attr('fill', d => {
            console.log('coloring with: ', d.parent.data.id);
            return color(d.parent.data.id)
          }) 
          // ang parent.data.id ay parang napakalalim na object, e.g.,
          // flare.vis.operator.layout.NodeLinkTreeLayout 
          // 'yung huling-huling naka-TitleCase ang leaf,
          .on('mouseover', d => handleMouseover(d))
          .on('mousemove', handleMouseMove)
          .on('mouseout', handleMouseOut)

    const leafTextArray = (d) => {
      return d.data.name.split(/(?=[A-Z][^A-Z])/g);
    };

    selectAll('g').append('clipPath') // kung lumampas 'yung text sa rect, iciclip nito
      .attr('id', d => 'clip-' + d.data.id )
      .append('use')
        .attr('xlink:href', d => '#' + d.data.id)
    selectAll('g').append('text')      
      .attr('clip-path', d => `url(#clip-${d.data.id})`)
      .selectAll('tspan')
      .data(d => leafTextArray(d)) // returns an array of the leaf element name
      .enter().append('tspan') // tspan kasi new line every 'word' ng leaf element name
        .attr('x', 4) // 4px from the left of rect
        .attr('y', (d,i) => (13 + i * 12)) // 13px below the top, 15px every line
        .text(d => d) // text isa-isang result nung split
    
    let categories = rootNode.leaves().map(i => i.parent.data.name)
    // let removeDupes = (categories) => {
    //   let seen = {};
    //   return categories.filter(i => (
    //     seen.hasOwnProperty(i) ? false : (seen[i] = true)
    //   ))
    // }
    const removeDupes = (categories) => {
      let seen = [];
      categories.filter(d => {
        // console.log('seen: ', seen);
        seen.includes(d) ? false : seen.push(d)
      })
      return seen
    }
    const categoriesFiltered = removeDupes(categories);
    
    console.log({ categoriesFiltered});
    
    selectAll(node).append('g')
      .attr('id', 'legend')

  }

  render() {
    return (
      <div id='main-container'>
        <h1>This is now a treemap of Flare</h1>
        <svg id='treemap' ref={node => this.node = node}
          viewBox={`0 0 ${this.state.w} ${this.state.h}`}
          preserveAspectRatio='xMidYMid meet'>
        </svg>
        <div id='tooltip' style={{'opacity': 0}}></div>
      </div>
    );
  };
};

render(
  <Treemap />,
  document.getElementById('root')
);

// selectAll('g').append('title')
//   // formatted ang value, ',d' -> decimal with comma separators
//   .text(d => d.data.id + '\n' + format(',d')(d.value)) // parang tooltip 'tong title element


