class_name HandType
extends RefCounted

# 12 种公司化原创牌型. 数值为 [基础执行力(chips), 基础组织能力倍率(mult)].
# id 越大优先级越高.
enum Id {
	HERO,              # 个人英雄        — 单卡
	MENTORSHIP,        # 师徒制          — 2 张同部门
	PROJECT_TEAM,      # 项目小组        — 3 张同部门
	CROSS_DEPARTMENT,  # 跨部门协同      — 3 张连续职级、不同部门
	PYRAMID,           # 金字塔结构      — 低中高各 1
	MIDDLE_PLATFORM,   # 中台架构        — 2 业务 + 1 中台
	PARTNERSHIP,       # 合伙人制        — 2 张 C-level
	MATRIX,            # 矩阵管理        — 同职级 × 4 部门
	WOLF_PACK,         # 狼性团队        — 5 张同部门
	OKR_ALIGNED,       # OKR 对齐        — 5 张连续职级
	IRON_TRIANGLE,     # 铁三角          — 产品+技术+销售 同职级
	FOUNDING_TEAM,     # 创始团队        — 5 张全 C-level
}

# 牌型基础值表. (chips, mult)
const BASE_VALUES := {
	Id.HERO:              [5,   1],
	Id.MENTORSHIP:        [10,  2],
	Id.PROJECT_TEAM:      [30,  3],
	Id.CROSS_DEPARTMENT:  [30,  4],
	Id.PYRAMID:           [40,  4],
	Id.MIDDLE_PLATFORM:   [35,  5],
	Id.PARTNERSHIP:       [50,  5],
	Id.MATRIX:            [40,  6],
	Id.WOLF_PACK:         [80,  7],
	Id.OKR_ALIGNED:       [80,  8],
	Id.IRON_TRIANGLE:     [60,  10],
	Id.FOUNDING_TEAM:     [200, 16],
}

static func name_of(id: int) -> String:
	match id:
		Id.HERO: return "个人英雄"
		Id.MENTORSHIP: return "师徒制"
		Id.PROJECT_TEAM: return "项目小组"
		Id.CROSS_DEPARTMENT: return "跨部门协同"
		Id.PYRAMID: return "金字塔结构"
		Id.MIDDLE_PLATFORM: return "中台架构"
		Id.PARTNERSHIP: return "合伙人制"
		Id.MATRIX: return "矩阵管理"
		Id.WOLF_PACK: return "狼性团队"
		Id.OKR_ALIGNED: return "OKR 对齐"
		Id.IRON_TRIANGLE: return "铁三角"
		Id.FOUNDING_TEAM: return "创始团队"
		_: return "?"

static func base_chips(id: int) -> int:
	return BASE_VALUES[id][0]

static func base_mult(id: int) -> int:
	return BASE_VALUES[id][1]


# 匹配结果结构: 牌型 id + 实际参与计分的卡 (后续 ScoreEngine 只对这些卡结算 base_chips).
class MatchResult:
	var hand_type_id: int
	var scoring_cards: Array[EmployeeCard]

	func _init(id: int, cards: Array[EmployeeCard]) -> void:
		hand_type_id = id
		scoring_cards = cards

	func describe() -> String:
		return "%s × %d 张 (基础 %d × %d)" % [
			HandType.name_of(hand_type_id),
			scoring_cards.size(),
			HandType.base_chips(hand_type_id),
			HandType.base_mult(hand_type_id),
		]
