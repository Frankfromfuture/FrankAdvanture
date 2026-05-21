# 牌面人物模块系统

目标：把牌面小人拆成可组合的幽默像素人物。不同职业、不同部门、不同等级通过模块组合体现差异，同时保留 3D 立体和悬浮感。

## 文件

- `moduleLibrary.js`：模块库。维护肤色、脸型、发型、服装、领带/徽章、眼镜、配饰、背景、特效等基础零件。
- `moduleTable.js`：模块表。按卡牌 ID 指定职业外观，例如算法专家使用实验服和 AI 道具，销售 VP 使用奖杯和董事会背景。
- `compositionRules.js`：组合规则。先按部门、等级、稀有度给默认模块，再用模块表覆盖，最后生成 CSS 变量和 class。
- `PixelPersonPortrait.jsx`：人物渲染组件。只负责把组合结果渲染成可样式化的像素 DOM。
- `assets/executive_modular_64x64_pixel_bust_avatar_system.svg`：综合 SVG 模板，保留原始 `SLOT_* / data-slot / data-option` 结构。
- `svgTemplateRenderer.js`：SVG 调用框架。解析综合 SVG，只渲染当前人物需要的模块，并用 CSS 变量覆盖肤色、发色、强调色。
- `executiveSvgAvatarRules.js`：游戏字段适配。把员工牌的部门、等级、稀有度和卡牌 ID 转成 SVG 模块选择。
- `ExecutiveSvgPortrait.jsx`：员工牌 SVG 肖像组件。功能牌和服务牌暂不接入。

## 扩展方式

1. 新增基础零件：在 `moduleLibrary.js` 增加模块，并在 `styles.css` 写对应 class。
2. 给某张牌定制人物：在 `moduleTable.js` 用卡牌 ID 覆盖模块组合。
3. 改通用规则：在 `compositionRules.js` 调整部门、等级或稀有度默认配置。
4. 调整 SVG 员工肖像：优先改 `executiveSvgAvatarRules.js` 的卡牌 ID 覆盖表；需要新零件时再扩展 SVG 模板。

## 视觉规则

- 研发：代码、实验、设备感更强。
- 销售：红色系、电话、合同、奖杯、舞台感更强。
- 运营：绿色系、表格、流程、财务、管理工具更强。
- 等级越高：体型更稳、服装更正式、配饰更稀有、特效更明显。
