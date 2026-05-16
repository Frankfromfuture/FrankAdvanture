extends SceneTree

# CLI demo: 演示 1 项目战斗 (4 出牌 / 3 弃牌) 的最小核心爽感.
# 用法: godot --headless --script res://scripts/tools/demo_battle.gd

const PROJECT_THRESHOLD := 300  # A 轮第一关分数门槛
const HAND_SIZE := 8
const PLAYS := 4
const DISCARDS := 3

var rng := RandomNumberGenerator.new()


func _init() -> void:
	rng.randomize()
	print("╔════════════════════════════════════╗")
	print("║  Frank's Adventure — M1 战斗 demo    ║")
	print("╚════════════════════════════════════╝\n")

	var deck := CardFactory.make_starter_pool()
	print("起步牌库: %d 张" % deck.size())
	print("项目分数门槛: %d  |  出牌 %d / 弃牌 %d\n" % [PROJECT_THRESHOLD, PLAYS, DISCARDS])

	# 洗牌.
	deck.shuffle()

	var hand: Array[EmployeeCard] = []
	var remaining_plays := PLAYS
	var remaining_discards := DISCARDS
	var total_score := 0
	var round_num := 0

	# 抽起始手牌.
	_draw_to_hand_size(hand, deck)

	while remaining_plays > 0 and total_score < PROJECT_THRESHOLD:
		round_num += 1
		print("─── 回合 %d (出 %d / 弃 %d / 当前分 %d / 门槛 %d) ───" % [
			round_num, remaining_plays, remaining_discards, total_score, PROJECT_THRESHOLD,
		])
		print("手牌:")
		for i in hand.size():
			print("  [%d] %s" % [i, hand[i].describe()])

		# 策略: 选出当前手牌中能形成最高分牌型的 1..5 张子集.
		var picked := _best_5_card_subset(hand)
		var match := HandTypeMatcher.match_hand(picked)
		var b := ScoreEngine.score(match)

		print("出牌: %s" % _short_names(picked))
		print("→ %s" % b.describe())
		total_score += b.final_score
		remaining_plays -= 1

		# 移除已出的牌, 补抽.
		_remove_played(hand, picked)
		_draw_to_hand_size(hand, deck)
		print("累计: %d\n" % total_score)

	if total_score >= PROJECT_THRESHOLD:
		print("✓ 项目完成! 最终得分 %d (剩余 %d 次出牌, 拿融资 ¥%d)" % [
			total_score, remaining_plays, 4 + remaining_plays,
		])
		quit(0)
	else:
		print("✗ 项目失败. 最终得分 %d / %d." % [total_score, PROJECT_THRESHOLD])
		quit(1)


# ---------- 辅助 ----------

func _draw_to_hand_size(hand: Array[EmployeeCard], deck: Array[EmployeeCard]) -> void:
	while hand.size() < HAND_SIZE and deck.size() > 0:
		hand.append(deck.pop_back())

func _remove_played(hand: Array[EmployeeCard], played: Array[EmployeeCard]) -> void:
	for c in played:
		hand.erase(c)

# M1 极简启发式: 暴力枚举所有 1..5 张子集, 选 final_score 最大的.
# (8 张手牌中, C(8,1)+C(8,2)+..+C(8,5) = 218, 完全 OK.)
func _best_5_card_subset(hand: Array[EmployeeCard]) -> Array[EmployeeCard]:
	var best_score := -1
	var best: Array[EmployeeCard] = []
	for size in range(1, 6):
		for combo in _combinations(hand, size):
			var m := HandTypeMatcher.match_hand(combo)
			var b := ScoreEngine.score(m)
			if b.final_score > best_score:
				best_score = b.final_score
				best = combo
	return best

# 返回 cards 的所有 k 元子集.
func _combinations(cards: Array[EmployeeCard], k: int) -> Array:
	var result: Array = []
	_combo_helper(cards, k, 0, [], result)
	return result

func _combo_helper(cards: Array[EmployeeCard], k: int, start: int,
		current: Array, result: Array) -> void:
	if current.size() == k:
		var copy: Array[EmployeeCard] = []
		for c in current:
			copy.append(c)
		result.append(copy)
		return
	for i in range(start, cards.size()):
		current.append(cards[i])
		_combo_helper(cards, k, i + 1, current, result)
		current.pop_back()

func _short_names(cards: Array[EmployeeCard]) -> String:
	var parts: Array[String] = []
	for c in cards:
		parts.append("%s%d" % [CardEnums.department_name(c.department), c.rank])
	return ", ".join(parts)
