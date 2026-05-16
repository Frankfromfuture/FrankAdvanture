class_name CardEnums
extends RefCounted

# 部门 (花色). M1 首发 5 部门; 后续解锁 FINANCE/HR/LEGAL.
enum Department {
	PRODUCT,     # 产品
	TECH,        # 技术
	SALES,       # 销售
	MARKETING,   # 市场
	OPERATIONS,  # 运营 (中台)
	FINANCE,     # 财务 (中台, 后期解锁)
	HR,          # 人力  (中台, 后期解锁)
	LEGAL,       # 法务 (后期解锁)
}

# 中台部门集合 (用于"中台架构"牌型识别).
const MIDDLE_PLATFORM_DEPARTMENTS := [
	Department.OPERATIONS,
	Department.FINANCE,
	Department.HR,
]

# 业务部门集合 (前台).
const BUSINESS_DEPARTMENTS := [
	Department.PRODUCT,
	Department.TECH,
	Department.SALES,
	Department.MARKETING,
]

# 铁三角部门集合.
const IRON_TRIANGLE_DEPARTMENTS := [
	Department.PRODUCT,
	Department.TECH,
	Department.SALES,
]

# 稀有度.
enum Rarity {
	COMMON,     # 普通 (白)
	RARE,       # 稀有 (蓝)
	EPIC,       # 史诗 (紫)
	LEGENDARY,  # 传奇 (金)
}

# 个性标签 (8 个起步, M5 扩到 12 个).
enum PersonalityTag {
	JUAN_WANG,        # 卷王
	MO_YU_MASTER,     # 摸鱼大师
	SERIAL_FOUNDER,   # 连续创业者
	LAO_HUANG_NIU,    # 老黄牛
	PPT_MASTER,       # PPT 大师
	HAI_GUI,          # 海归
	ER_DAI,           # 二代
	TECH_FREAK,       # 技术控
}

# 职级常量 (1=实习生 .. 13=C-level).
const RANK_INTERN := 1
const RANK_C_LEVEL := 13
const RANK_LOW_MAX := 5       # 1..5 = 低层
const RANK_MID_MAX := 10      # 6..10 = 中层
# 11..13 = 高层

# 工具函数: 部门 enum -> 中文显示名.
static func department_name(d: int) -> String:
	match d:
		Department.PRODUCT: return "产品"
		Department.TECH: return "技术"
		Department.SALES: return "销售"
		Department.MARKETING: return "市场"
		Department.OPERATIONS: return "运营"
		Department.FINANCE: return "财务"
		Department.HR: return "人力"
		Department.LEGAL: return "法务"
		_: return "?"

static func rank_name(r: int) -> String:
	if r <= 2: return "实习生"
	elif r <= 4: return "初级"
	elif r <= 6: return "高级"
	elif r <= 8: return "经理"
	elif r <= 10: return "总监"
	elif r <= 12: return "VP"
	else: return "C-level"

static func rarity_name(r: int) -> String:
	match r:
		Rarity.COMMON: return "普通"
		Rarity.RARE: return "稀有"
		Rarity.EPIC: return "史诗"
		Rarity.LEGENDARY: return "传奇"
		_: return "?"

static func tag_name(t: int) -> String:
	match t:
		PersonalityTag.JUAN_WANG: return "卷王"
		PersonalityTag.MO_YU_MASTER: return "摸鱼大师"
		PersonalityTag.SERIAL_FOUNDER: return "连续创业者"
		PersonalityTag.LAO_HUANG_NIU: return "老黄牛"
		PersonalityTag.PPT_MASTER: return "PPT 大师"
		PersonalityTag.HAI_GUI: return "海归"
		PersonalityTag.ER_DAI: return "二代"
		PersonalityTag.TECH_FREAK: return "技术控"
		_: return "?"

static func is_middle_platform(d: int) -> bool:
	return d in MIDDLE_PLATFORM_DEPARTMENTS

static func is_business(d: int) -> bool:
	return d in BUSINESS_DEPARTMENTS

# 职级分层: 低/中/高.
static func rank_tier(r: int) -> int:
	if r <= RANK_LOW_MAX: return 0       # low
	elif r <= RANK_MID_MAX: return 1     # mid
	else: return 2                        # high
