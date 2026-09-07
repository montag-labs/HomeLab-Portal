import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { GridStack } from "gridstack";
import type { GridItemHTMLElement, GridStackNode } from "gridstack";
import "gridstack/dist/gridstack.min.css";
import type { Rectangle } from "./types";

interface Item extends Rectangle { id: string }
// React owns the elements and their content; GridStack only owns geometry and gestures.
export function DeviceGrid({ items, editable, onChange, render, kind = "tiles" }: {
  items: Item[]; editable: boolean; onChange: (items: (Rectangle & { id: string })[]) => void;
  render: (id: string) => ReactNode; kind?: "groups" | "tiles";
}) {
  const container = useRef<HTMLDivElement>(null);
  const grid = useRef<GridStack | null>(null);
  const syncing = useRef(false);
  const update = useRef(onChange);
  const canEdit = useRef(editable);
  useLayoutEffect(() => { update.current = onChange; canEdit.current = editable; }, [onChange, editable]);
  useLayoutEffect(() => {
    const instance = GridStack.init({ auto: false, column: 12, cellHeight: kind === "groups" ? 80 : 44, margin: 6, float: true, animate: false, handle: kind === "groups" ? ".device-group-handle" : ".device-tile-handle", draggable: { cancel: "input,select,button,a" }, resizable: { handles: "se" }, minRow: 1 }, container.current!);
    if (!instance) return;
    grid.current = instance;
    instance.on("change", (_event, nodes: GridStackNode[]) => {
      if (!syncing.current && canEdit.current) update.current(nodes.filter(node => node.id).map(node => ({ id: node.id!, x: node.x ?? 0, y: node.y ?? 0, w: node.w ?? 1, h: node.h ?? 1 })));
    });
    return () => { instance.destroy(false); grid.current = null; };
  }, [kind]);
  useLayoutEffect(() => {
    const instance = grid.current;
    if (!instance) return;
    syncing.current = true;
    instance.batchUpdate();
    const expected = new Set(items.map(item => item.id));
    for (const node of [...instance.engine.nodes]) if (node.id && !expected.has(node.id) && node.el) instance.removeWidget(node.el, false, false);
    for (const element of Array.from(container.current!.children) as GridItemHTMLElement[]) {
      const item = items.find(value => value.id === element.dataset.id);
      if (!item) continue;
      if (!element.gridstackNode) instance.makeWidget(element, { ...item, minW: kind === "groups" ? 4 : 2, minH: kind === "groups" ? 3 : 2 });
      else instance.update(element, item);
    }
    instance.setStatic(!editable);
    const desktop = window.matchMedia("(min-width: 761px)").matches;
    instance.enableMove(editable && desktop);
    instance.enableResize(editable && desktop);
    instance.batchUpdate(false);
    syncing.current = false;
    if (editable) update.current(instance.engine.nodes.filter(node => node.id).map(node => ({ id: node.id!, x: node.x ?? 0, y: node.y ?? 0, w: node.w ?? 1, h: node.h ?? 1 })));
  }, [items, editable, kind]);
  return <div ref={container} className={`grid-stack device-grid device-grid-${kind}`}>
    {items.map(item => <div className="grid-stack-item" data-id={item.id} key={item.id}><div className="grid-stack-item-content">{render(item.id)}</div></div>)}
  </div>;
}
