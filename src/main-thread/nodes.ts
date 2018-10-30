/**
 * Copyright 2018 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { TransferrableNode, NodeType } from '../transfer/TransferrableNodes';
import { TransferrableKeys } from '../transfer/TransferrableKeys';
import { get as getString } from './strings';

let count: number = 2;
let NODES: Map<number, Node>;
let BASE_ELEMENT: HTMLElement;

function serializeDefaultNode(node: Node): void {
  storeNode(node, ++count);
  node.childNodes.forEach(node => serializeDefaultNode(node));
}

export function prepare(baseElement: Element): void {
  NODES = new Map([[1, baseElement], [2, baseElement]]);
  BASE_ELEMENT = baseElement as HTMLElement;
  console.log('prepare', baseElement);
  baseElement._index_ = 2;
  baseElement.childNodes.forEach(node => serializeDefaultNode(node));
}

export function isTextNode(node: Node | TransferrableNode): boolean {
  return ('nodeType' in node ? node.nodeType : node[TransferrableKeys.nodeType]) === NodeType.TEXT_NODE;
}

/**
 * Create a real DOM Node from a skeleton Object (`{ nodeType, nodeName, attributes, children, data }`)
 * @example <caption>Text node</caption>
 *   createNode({ nodeType:3, data:'foo' })
 * @example <caption>Element node</caption>
 *   createNode({ nodeType:1, nodeName:'div', attributes:[{ name:'a', value:'b' }], childNodes:[ ... ] })
 */
export function createNode(skeleton: TransferrableNode, sanitizer?: Sanitizer): Node | null {
  if (isTextNode(skeleton)) {
    const node = document.createTextNode(getString(skeleton[TransferrableKeys.textContent] as number));
    storeNode(node, skeleton[TransferrableKeys._index_]);
    return node as Node;
  }

  const namespace: string | undefined =
    skeleton[TransferrableKeys.namespaceURI] !== undefined ? getString(skeleton[TransferrableKeys.namespaceURI] as number) : undefined;
  const nodeName = getString(skeleton[TransferrableKeys.nodeName]);
  const node: HTMLElement | SVGElement = namespace ? (document.createElementNS(namespace, nodeName) as SVGElement) : document.createElement(nodeName);

  // TODO(KB): Restore Properties
  // skeleton.properties.forEach(property => {
  //   node[`${property.name}`] = property.value;
  // });
  // ((skeleton as TransferrableElement)[TransferrableKeys.childNodes] || []).forEach(childNode => {
  //   if (childNode[TransferrableKeys.transferred] === NumericBoolean.FALSE) {
  //     node.appendChild(createNode(childNode as TransferrableNode));
  //   }
  // });

  // If `node` is removed by the sanitizer, don't store it and return null.
  if (sanitizer && !sanitizer.sanitize(node)) {
    return null;
  }
  storeNode(node, skeleton[TransferrableKeys._index_]);
  return node as Node;
}

/**
 * Returns the real DOM Element corresponding to a serialized Element object.
 * @param id
 * @return RenderableElement
 */
export function getNode(id: number): RenderableElement {
  const node = NODES.get(id);

  if (node && node.nodeName === 'BODY') {
    // If the node requested is the "BODY"
    // Then we return the base node this specific <amp-script> comes from.
    // This encapsulates each <amp-script> node.
    return BASE_ELEMENT as RenderableElement;
  }
  return node as RenderableElement;
}

/**
 * Establish link between DOM `node` and worker-generated identifier `id`.
 *
 * These _shouldn't_ collide between instances of <amp-script> since
 * each element creates it's own pool on both sides of the worker
 * communication bridge.
 * @param node
 * @param id
 */
export function storeNode(node: Node, id: number): void {
  (node as Node)._index_ = id;
  console.log('storeNode', node, node._index_);
  NODES.set(id, node as Node);
}
