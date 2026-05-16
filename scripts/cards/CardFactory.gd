class_name CardFactory
extends RefCounted

# M1 起步牌库工厂. M2 后会被 Deck.gd / 商店系统替代为真正的雇佣流程.
# 程序生成 65 张起步卡: 5 部门 × 13 职级, 全普通稀有度, 无标签.

# 生成 5 × 13 = 65 张起步员工卡.
static func make_starter_pool() -> Array[EmployeeCard]:
	var pool: Array[EmployeeCard] = []
	var depts := CardEnums.BUSINESS_DEPARTMENTS + [CardEnums.Department.OPERATIONS]
	for d in depts:
		for r in range(1, 14):
			var c := EmployeeCard.new()
			c.card_name = "%s%d" % [CardEnums.department_name(d), r]
			c.department = d
			c.rank = r
			c.rarity = CardEnums.Rarity.COMMON
			c.tags = []
			pool.append(c)
	return pool

# 程序生成单卡 (便于测试 / demo).
static func make(dept: int, rank: int, rarity: int = CardEnums.Rarity.COMMON,
		tags: Array[int] = [], card_name: String = "") -> EmployeeCard:
	var c := EmployeeCard.new()
	c.card_name = card_name if card_name != "" else "%s%d" % [CardEnums.department_name(dept), rank]
	c.department = dept
	c.rank = rank
	c.rarity = rarity
	c.tags = tags
	return c

# 从 .tres 资源加载一张员工卡.
static func from_resource(path: String) -> EmployeeCard:
	var res := load(path)
	if res is EmployeeCard:
		return res
	push_warning("无法加载员工卡资源: %s" % path)
	return null
