class_name ScoreEngine
extends RefCounted

# 分数引擎 — 修饰器栈核心.
# 最终分 = (∑ 卡基础执行力 + 牌型基础执行力 + IT/装修加成) × (牌型倍率 + 标签倍率 + 咨询 xMult) × CEO 特质规则重写
#
# 实现按 4 通道严格分离 (见 plan 文件 第四章):
#   - +chips      (IT 系统 / 卡基础)
#   - +mult       (办公室/福利)
#   - xMult       (咨询服务包)
#   - rewrite     (CEO 特质 — M4 之后注入)
#
# M1 仅实现 base chips + base mult 通道, 留出钩子待 M4 注入.

# 结算结果 (供 UI 与日志使用).
class ScoreBreakdown:
	var hand_type_id: int = -1
	var hand_type_name: String = ""
	var base_chips: int = 0            # 牌型基础执行力
	var card_chips: int = 0            # ∑ 卡基础执行力
	var bonus_chips: int = 0           # +chips 通道叠加 (IT / 标签触发)
	var base_mult: int = 0             # 牌型基础倍率
	var bonus_mult: int = 0            # +mult 通道叠加 (办公室)
	var x_mult: float = 1.0            # xMult 通道乘积 (咨询)
	var final_score: int = 0

	func describe() -> String:
		return "[%s] (%d + %d + %d) × (%d + %d) × %.2fx = %d" % [
			hand_type_name,
			card_chips, base_chips, bonus_chips,
			base_mult, bonus_mult,
			x_mult,
			final_score,
		]


# 计算一手牌的得分. modifiers 在 M4 注入, 现在传 null 即可.
static func score(match_result: HandType.MatchResult, modifiers = null) -> ScoreBreakdown:
	var b := ScoreBreakdown.new()
	if match_result == null:
		return b

	b.hand_type_id = match_result.hand_type_id
	b.hand_type_name = HandType.name_of(match_result.hand_type_id)
	b.base_chips = HandType.base_chips(match_result.hand_type_id)
	b.base_mult = HandType.base_mult(match_result.hand_type_id)

	# ∑ 卡基础执行力 (只计参与计分的卡).
	for c in match_result.scoring_cards:
		b.card_chips += c.base_chips()

	# TODO(M4): 注入 IT 系统 +chips / 标签 +chips 触发 → b.bonus_chips
	# TODO(M4): 注入 办公室/福利 +mult → b.bonus_mult
	# TODO(M4): 注入 咨询服务包 xMult → b.x_mult
	# TODO(M4): 注入 CEO 特质 规则重写 (可能触发整手再计算一次, 或修改 base 值)

	var total_chips := b.card_chips + b.base_chips + b.bonus_chips
	var total_mult := b.base_mult + b.bonus_mult
	b.final_score = int(round(total_chips * total_mult * b.x_mult))
	return b
