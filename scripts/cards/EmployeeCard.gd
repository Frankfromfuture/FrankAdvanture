class_name EmployeeCard
extends Resource

# 员工卡 — 5 维数据模型 (部门 × 职级 × 个性标签 × 稀有度 × 经验值).
# 视觉只显式露 4 维; 经验值仅 hover 可见, 满阈值后驱动稀有度晋升.

@export var card_name: String = "员工"
@export var department: int = CardEnums.Department.PRODUCT
@export_range(1, 13) var rank: int = 1
@export var tags: Array[int] = []      # PersonalityTag enum 值, 最多 2 个
@export var rarity: int = CardEnums.Rarity.COMMON
@export var experience: int = 0
@export var portrait_path: String = ""  # 像素卡面图素材路径, 后续填

# 单卡基础执行力 (= rank * 系数 + 稀有度加成). 在 ScoreEngine 中调用.
func base_chips() -> int:
	var chip := rank * 2
	match rarity:
		CardEnums.Rarity.RARE: chip += 5
		CardEnums.Rarity.EPIC: chip += 12
		CardEnums.Rarity.LEGENDARY: chip += 25
	return chip

# 经验值升级阈值 (普通->稀有 5 次, 稀有->史诗 10 次, 史诗->传奇 20 次).
func xp_threshold() -> int:
	match rarity:
		CardEnums.Rarity.COMMON: return 5
		CardEnums.Rarity.RARE: return 10
		CardEnums.Rarity.EPIC: return 20
		_: return -1  # 传奇不再晋升

# 是否可晋升 (累计经验值是否达阈值).
func can_promote() -> bool:
	var t := xp_threshold()
	return t > 0 and experience >= t

# 晋升一级稀有度并清零经验值.
func promote() -> void:
	if not can_promote():
		return
	experience = 0
	rarity = mini(rarity + 1, CardEnums.Rarity.LEGENDARY)

# 短描述, 调试/CLI 用.
func describe() -> String:
	var tag_str := ""
	if not tags.is_empty():
		var tag_names: Array[String] = []
		for t in tags:
			tag_names.append(CardEnums.tag_name(t))
		tag_str = "[" + ", ".join(tag_names) + "]"
	return "%s · %s部 · %d级(%s) · %s %s" % [
		card_name,
		CardEnums.department_name(department),
		rank,
		CardEnums.rank_name(rank),
		CardEnums.rarity_name(rarity),
		tag_str,
	]
