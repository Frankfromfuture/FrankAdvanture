class_name HandTypeMatcher
extends RefCounted

# 输入 1..5 张员工卡, 返回最高优先级的 HandType.MatchResult.
# 优先级 = HandType.Id 数值从大到小. 同优先级里 scoring_cards 取首个命中的子集.
static func match_hand(cards: Array[EmployeeCard]) -> HandType.MatchResult:
	if cards == null or cards.is_empty():
		return null

	var n := cards.size()

	# FOUNDING_TEAM: 5 张全 C-level (rank 13).
	if n == 5 and _all_rank(cards, CardEnums.RANK_C_LEVEL):
		return HandType.MatchResult.new(HandType.Id.FOUNDING_TEAM, cards.duplicate())

	# IRON_TRIANGLE: 产品+技术+销售 同职级 (任意 3 张子集).
	var iron := _find_iron_triangle(cards)
	if iron.size() == 3:
		return HandType.MatchResult.new(HandType.Id.IRON_TRIANGLE, iron)

	# OKR_ALIGNED: 5 张连续职级 (允许部门任意).
	if n == 5 and _is_consecutive_ranks(cards):
		return HandType.MatchResult.new(HandType.Id.OKR_ALIGNED, cards.duplicate())

	# WOLF_PACK: 5 张同部门.
	if n == 5 and _all_same_dept(cards):
		return HandType.MatchResult.new(HandType.Id.WOLF_PACK, cards.duplicate())

	# MATRIX: 同职级 × 4 不同部门.
	var matrix := _find_matrix(cards)
	if matrix.size() == 4:
		return HandType.MatchResult.new(HandType.Id.MATRIX, matrix)

	# PARTNERSHIP: 2 张 C-level.
	var partnership := _find_c_level_pair(cards)
	if partnership.size() == 2:
		return HandType.MatchResult.new(HandType.Id.PARTNERSHIP, partnership)

	# MIDDLE_PLATFORM: 2 业务 + 1 中台.
	var mp := _find_middle_platform(cards)
	if mp.size() == 3:
		return HandType.MatchResult.new(HandType.Id.MIDDLE_PLATFORM, mp)

	# PYRAMID: 1 低 + 1 中 + 1 高.
	var pyramid := _find_pyramid(cards)
	if pyramid.size() == 3:
		return HandType.MatchResult.new(HandType.Id.PYRAMID, pyramid)

	# CROSS_DEPARTMENT: 3 张连续职级, 部门两两不同.
	var cross := _find_cross_dept(cards)
	if cross.size() == 3:
		return HandType.MatchResult.new(HandType.Id.CROSS_DEPARTMENT, cross)

	# PROJECT_TEAM: 3 张同部门.
	var pt := _find_n_same_dept(cards, 3)
	if pt.size() == 3:
		return HandType.MatchResult.new(HandType.Id.PROJECT_TEAM, pt)

	# MENTORSHIP: 2 张同部门.
	var ms := _find_n_same_dept(cards, 2)
	if ms.size() == 2:
		return HandType.MatchResult.new(HandType.Id.MENTORSHIP, ms)

	# HERO: 单卡 — 选最高职级的一张计分.
	var hero_cards: Array[EmployeeCard] = [_highest_rank_card(cards)]
	return HandType.MatchResult.new(HandType.Id.HERO, hero_cards)


# ---------- 工具函数 ----------

static func _all_rank(cards: Array[EmployeeCard], r: int) -> bool:
	for c in cards:
		if c.rank != r:
			return false
	return true

static func _all_same_dept(cards: Array[EmployeeCard]) -> bool:
	if cards.is_empty():
		return false
	var d := cards[0].department
	for c in cards:
		if c.department != d:
			return false
	return true

static func _is_consecutive_ranks(cards: Array[EmployeeCard]) -> bool:
	var ranks: Array[int] = []
	for c in cards:
		ranks.append(c.rank)
	ranks.sort()
	for i in range(1, ranks.size()):
		if ranks[i] - ranks[i - 1] != 1:
			return false
	return true

static func _highest_rank_card(cards: Array[EmployeeCard]) -> EmployeeCard:
	var best := cards[0]
	for c in cards:
		if c.rank > best.rank:
			best = c
	return best

# 找一组 N 张同部门的卡, 优先取职级总和最高的部门组.
static func _find_n_same_dept(cards: Array[EmployeeCard], n: int) -> Array[EmployeeCard]:
	var by_dept := {}
	for c in cards:
		if not by_dept.has(c.department):
			by_dept[c.department] = []
		by_dept[c.department].append(c)
	var best: Array[EmployeeCard] = []
	var best_score := -1
	for d in by_dept:
		var group: Array = by_dept[d]
		if group.size() >= n:
			# 取该部门职级最高的前 n 张.
			group.sort_custom(func(a, b): return a.rank > b.rank)
			var picked: Array[EmployeeCard] = []
			var score := 0
			for i in n:
				picked.append(group[i])
				score += group[i].rank
			if score > best_score:
				best_score = score
				best = picked
	return best

# 找产品+技术+销售各 1 张, 三者职级相同.
static func _find_iron_triangle(cards: Array[EmployeeCard]) -> Array[EmployeeCard]:
	# 按 rank 分组, 检查每个 rank 是否同时含 P/T/S.
	var by_rank := {}
	for c in cards:
		if not by_rank.has(c.rank):
			by_rank[c.rank] = {}
		# 每个 rank 内, 每部门只留首张.
		if not by_rank[c.rank].has(c.department):
			by_rank[c.rank][c.department] = c
	var best: Array[EmployeeCard] = []
	# 优先选 rank 最高的铁三角.
	var ranks: Array = by_rank.keys()
	ranks.sort()
	ranks.reverse()
	for r in ranks:
		var depts: Dictionary = by_rank[r]
		if depts.has(CardEnums.Department.PRODUCT) \
				and depts.has(CardEnums.Department.TECH) \
				and depts.has(CardEnums.Department.SALES):
			best = [
				depts[CardEnums.Department.PRODUCT],
				depts[CardEnums.Department.TECH],
				depts[CardEnums.Department.SALES],
			]
			return best
	return []

# 找同职级 × 4 不同部门.
static func _find_matrix(cards: Array[EmployeeCard]) -> Array[EmployeeCard]:
	var by_rank := {}
	for c in cards:
		if not by_rank.has(c.rank):
			by_rank[c.rank] = {}
		if not by_rank[c.rank].has(c.department):
			by_rank[c.rank][c.department] = c
	var best: Array[EmployeeCard] = []
	for r in by_rank:
		var depts: Dictionary = by_rank[r]
		if depts.size() >= 4:
			# 取前 4 个部门 (任意).
			var picked: Array[EmployeeCard] = []
			var count := 0
			for d in depts:
				picked.append(depts[d])
				count += 1
				if count == 4:
					break
			if picked.size() == 4 and best.is_empty():
				best = picked
	return best

# 找 2 张 C-level (rank 13).
static func _find_c_level_pair(cards: Array[EmployeeCard]) -> Array[EmployeeCard]:
	var c_levels: Array[EmployeeCard] = []
	for c in cards:
		if c.rank == CardEnums.RANK_C_LEVEL:
			c_levels.append(c)
	if c_levels.size() >= 2:
		# 取前 2 张.
		return [c_levels[0], c_levels[1]]
	return []

# 找 2 业务部门 + 1 中台部门 (3 张不同卡).
static func _find_middle_platform(cards: Array[EmployeeCard]) -> Array[EmployeeCard]:
	var biz: Array[EmployeeCard] = []
	var middle: Array[EmployeeCard] = []
	for c in cards:
		if CardEnums.is_business(c.department):
			biz.append(c)
		elif CardEnums.is_middle_platform(c.department):
			middle.append(c)
	if biz.size() >= 2 and middle.size() >= 1:
		# 取业务里 rank 最高的 2 张 + 中台里 rank 最高的 1 张.
		biz.sort_custom(func(a, b): return a.rank > b.rank)
		middle.sort_custom(func(a, b): return a.rank > b.rank)
		return [biz[0], biz[1], middle[0]]
	return []

# 找 1 低 + 1 中 + 1 高 (rank_tier 各 1).
static func _find_pyramid(cards: Array[EmployeeCard]) -> Array[EmployeeCard]:
	var low: Array[EmployeeCard] = []
	var mid: Array[EmployeeCard] = []
	var high: Array[EmployeeCard] = []
	for c in cards:
		match CardEnums.rank_tier(c.rank):
			0: low.append(c)
			1: mid.append(c)
			2: high.append(c)
	if low.is_empty() or mid.is_empty() or high.is_empty():
		return []
	# 各层取 rank 最高的.
	low.sort_custom(func(a, b): return a.rank > b.rank)
	mid.sort_custom(func(a, b): return a.rank > b.rank)
	high.sort_custom(func(a, b): return a.rank > b.rank)
	return [low[0], mid[0], high[0]]

# 找 3 张连续职级, 三个不同部门.
static func _find_cross_dept(cards: Array[EmployeeCard]) -> Array[EmployeeCard]:
	# 暴力 3-组合搜索 (上限 5 张, C(5,3)=10).
	var n := cards.size()
	if n < 3:
		return []
	for i in n:
		for j in range(i + 1, n):
			for k in range(j + 1, n):
				var trio: Array[EmployeeCard] = [cards[i], cards[j], cards[k]]
				if _is_consecutive_ranks(trio) and _all_unique_depts(trio):
					return trio
	return []

static func _all_unique_depts(cards: Array[EmployeeCard]) -> bool:
	var seen := {}
	for c in cards:
		if seen.has(c.department):
			return false
		seen[c.department] = true
	return true
