export const SHADES = {
  rose: {name:'柔雾玫瑰',code:'01 / ROSE',color:'#aa4964',description:'柔和的玫瑰豆沙调，带一点粉与棕的感觉，色彩安静、不张扬。',suggestion:'柔和的玫瑰豆沙调。先用薄薄一层，保留你原本的唇色。'},
  peach: {name:'暖杏珊瑚',code:'02 / PEACH',color:'#c26750',description:'带橘意的暖杏珊瑚调，像熟杏混入一抹粉色，感觉轻盈、明快。',suggestion:'带一点暖橘的珊瑚调。适合想尝试轻盈、明快感觉的今天。'},
  berry: {name:'微醺莓果',code:'03 / BERRY',color:'#883959',description:'偏深的莓果紫红调，像熟透的浆果，颜色更沉静，轮廓更鲜明。',suggestion:'偏深的莓果调。保留简洁的其他妆容，让唇色成为你想表达的重点。'},
  red: {name:'自在正红',code:'04 / RED',color:'#b3273e',description:'鲜明的红色，带少量冷调，像一朵盛开的红玫瑰，存在感更强。',suggestion:'鲜明而清楚的一抹红。可以先从薄涂试起，再调到你喜欢的浓度。'}
};
export const OCCASIONS={daily:'日常出门',interview:'面试 / 工作',date:'与朋友相聚'};
export const PERSONAS={gentle:'轻松开始',vision:'听觉优先',hands:'操作更轻松'};
export function recommendation(occasion,style){return style==='bold'?(occasion==='date'?'red':'berry'):(occasion==='date'?'peach':'rose');}
export function concentration(value){return value<=45?'自然薄涂':value<=65?'适中上色':'鲜明浓涂';}
export function describeColor(shade,intensity,available=true){const s=SHADES[shade]||SHADES.rose;return `你选的是「${s.name}」。${s.description}当前浓度为 ${intensity}%，属于${concentration(intensity)}。${intensity<=45?'原本唇色仍会透出来，变化比较轻柔。':'唇部颜色更明显，整体对比也会更强。'}${available?'你可以切换原图比较，也可以继续调淡。':'当前照片还没有定位到唇部，以上是色彩选项的说明，暂未生成试色效果。'}`;}
// ponytail: transparent preset branches for this static prototype; replace with a server-side model endpoint for free-form AI conversation.
export function replyFor(message,state){
  const rec=SHADES[recommendation(state.occasion,state.style)];
  const context=`按你选择的「${OCCASIONS[state.occasion]}」和「${state.style==='soft'?'自然一点':'鲜明一点'}」，可以先试「${rec.name}」。`;
  if(/自杀|自残|不想活|结束生命/.test(message))return '听起来你现在很难受。请先把可能伤害自己的物品放远一些，联系一位你信任的人陪在身边。如果你正处在危险中，请立即联系当地急救或紧急服务。这个美妆演示无法提供危机干预，我们先把你的安全放在最前面。';
  if(/过敏|红肿|破皮|伤口|皮炎|烧伤|疤痕/.test(message))return '这类皮肤状况需要相应专业人士判断是否适合上妆。我们先暂停在受影响区域尝试新产品；你可以在「温暖同行」查看专业咨询的流程。这个 Demo 不作皮肤诊断，也不提供治疗建议。';
  if(/手|帮忙|协助|残疾|不方便/.test(message))return `可以。我们先用照片试色，减少反复拿取工具的操作。${context}需要实际动手时，可以去「温暖同行」选择上妆协助，提前写下你的操作需求。是否需要帮助、希望怎样帮，都由你决定。`;
  if(/看不清|视障|盲|听|颜色/.test(message))return `当然可以。${context}${rec.description}进入试妆页后，点击「听听试色描述」，我会把颜色和浓淡说清楚。你也可以在右上角打开自动朗读或大字模式。`;
  if(/焦虑|怕|丑|不敢|奇怪|紧张|担心|难看|自卑/.test(message))return `担心被评价时，想慢一点开始很正常。你不需要先改变自己，才值得被喜欢。${context}今天也可以只是看看效果，不必马上上妆。我们不打分，也不替你定义什么样才算美。`;
  if(/男|性别|老人|长者|年龄/.test(message))return `美妆可以是任何人的表达方式，选择不需要被性别或年龄限定。${context}本次演示先覆盖听觉优先、操作帮助和轻松开始；适老与更多专业场景列在演示说明的后续拓展里。`;
  if(/面试|上班|工作|约会|聚会|朋友|日常|新手|不会|开始/.test(message))return `${context}${rec.suggestion}下一步只需要试一抹颜色，再决定喜不喜欢。右侧建议会根据你选择的场景与妆感变化，点击「带着建议去试色」就能开始。`;
  return `我收到了你的想法。这是预设情景演示，还不能像正式的 AI 一样理解所有自由提问。${context}你可以继续点选「有点不敢开始」「把颜色说给我听」或「我需要上妆帮助」，体验对应的支持方式。`;
}
