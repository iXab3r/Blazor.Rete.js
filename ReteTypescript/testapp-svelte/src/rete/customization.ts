import { NodeEditor, GetSchemes, ClassicPreset } from 'rete';

import { AreaExtensions, AreaPlugin } from 'rete-area-plugin';
import {
  ConnectionPlugin,
  Presets as ConnectionPresets,
} from 'rete-connection-plugin';

import {
  SveltePlugin,
  SvelteArea2D,
  Presets as SveltePresets,
} from 'rete-svelte-plugin';

import CustomNodeComponent from '../customization/CustomNode.svelte';
import CustomConnectionComponent from '../customization/CustomConnection.svelte';
import CustomSocketComponent from '../customization/CustomSocket.svelte';
import { addCustomBackground } from '../customization/custom-background';

type Schemes = GetSchemes<
  ClassicPreset.Node,
  ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;
type AreaExtra = SvelteArea2D<Schemes>;

const socket = new ClassicPreset.Socket('socket');

export async function createEditor(container: HTMLElement) {
  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();

  const svelteRender = new SveltePlugin<Schemes, AreaExtra>();

  AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
    accumulating: AreaExtensions.accumulateOnCtrl(),
  });

  svelteRender.addPreset(
    SveltePresets.classic.setup({
      customize: {
        node() {
          return CustomNodeComponent as any;
        },
        connection() {
          return CustomConnectionComponent as any;
        },
        socket() {
          return CustomSocketComponent as any;
        },
      },
    })
  );

  connection.addPreset(ConnectionPresets.classic.setup());

  addCustomBackground(area);

  editor.use(area);
  area.use(connection);

  area.use(svelteRender);

  AreaExtensions.simpleNodesOrder(area);

  const aLabel = 'Custom';
  const bLabel = 'Custom';

  const a = new ClassicPreset.Node(aLabel);
  a.addOutput('a', new ClassicPreset.Output(socket));
  a.addInput('a', new ClassicPreset.Input(socket));
  await editor.addNode(a);

  const b = new ClassicPreset.Node(bLabel);
  b.addOutput('a', new ClassicPreset.Output(socket));
  b.addInput('a', new ClassicPreset.Input(socket));
  await editor.addNode(b);

  await area.translate(a.id, { x: 0, y: 0 });
  await area.translate(b.id, { x: 300, y: 0 });

  await editor.addConnection(new ClassicPreset.Connection(a, 'a', b, 'a'));

  setTimeout(() => {
    AreaExtensions.zoomAt(area, editor.getNodes());
  }, 300);

  return {
    destroy: () => area.destroy(),
  };
}
