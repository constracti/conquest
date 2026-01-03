<?php

require_once 'config.php';
require_once 'dt.php';

// database

$db = NULL;
try {
	$db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
} catch (mysqli_sql_exception $e) {
	exit('mysqli::__construct');
}
try {
	if (!$db->set_charset('utf8mb4'))
		exit('mysqli::set_charset');
} catch (mysqli_sql_exception $e) {
	exit('mysqli::set_charset');
}

function stmt_list(mysqli_stmt $stmt): array {
	$stmt->execute();
	$rslt = $stmt->get_result();
	$list = [];
	while (!is_null($item = $rslt->fetch_assoc()))
		$list[] = $item;
	$rslt->free();
	$stmt->close();
	return $list;
}

function stmt_item(mysqli_stmt $stmt): ?array {
	$list = stmt_list($stmt);
	if (empty($list))
		return NULL;
	return $list[0];
}

function stmt_cell(mysqli_stmt $stmt): mixed {
	$item = stmt_item($stmt);
	if (is_null($item))
		return NULL;
	$item = array_values($item);
	assert(!empty($item));
	return $item[0];
}

function stmt_bool(mysqli_stmt $stmt): bool {
	return !is_null(stmt_item($stmt));
}

// config

function config_get(string $name, mixed $default): mixed {
	global $db;
	$stmt = $db->prepare('SELECT `value` FROM `config` WHERE `name` = ?');
	$stmt->bind_param('s', $name);
	$value = stmt_cell($stmt);
	if (is_null($value))
		return NULL;
	return unserialize($value);
}

function config_set(string $name, mixed $value): void {
	global $db;
	$value = serialize($value);
	$stmt = $db->prepare('REPLACE INTO `config` (`name`, `value`) VALUES (?, ?)');
	$stmt->bind_param('ss', $name, $value);
	$stmt->execute();
	$stmt->close();
}

function config_get_game_start(): DT {
	$game_start = config_get('game_start', 0);
	return DT::from_int($game_start);
}

function config_get_game_stop(): DT {
	$game_stop = config_get('game_stop', 0);
	return DT::from_int($game_stop);
}

function config_get_reward_success(): int {
	return config_get('reward_success', 1);
}

function config_get_reward_conquest(): int {
	return config_get('reward_conquest', 1);
}

function config_get_reward_rate(): float {
	return config_get('reward_rate', 0.);
}

function get_game_state(DT $now, DT $game_start, DT $game_stop): string {
	if ($now->dt < $game_start->dt)
		return 'pending';
	if ($now->dt >= $game_stop->dt)
		return 'finished';
	return 'running';
}

// setup

function setup_select_by_id(string $id): ?array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name` FROM `setup` WHERE `id` = ?');
	$stmt->bind_param('s', $id);
	return stmt_item($stmt);
}

function setup_exists(string $id): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `setup` WHERE `id` = ?');
	$stmt->bind_param('s', $id);
	return stmt_bool($stmt);
}

function setup_matches(string $id, string $password): bool {
	global $db;
	$stmt = $db->prepare('SELECT `hash` FROM `setup` WHERE `id` = ?');
	$stmt->bind_param('s', $id);
	$hash = stmt_cell($stmt);
	if (is_null($hash))
		return FALSE;
	return password_verify($password, $hash);
}

function setup_insert(string $id, string $name, string $password): void {
	global $db;
	$hash = password_hash($password, PASSWORD_DEFAULT);
	$stmt = $db->prepare('INSERT INTO `setup` (`id`, `name`, `hash`) VALUES (?, ?, ?)');
	$stmt->bind_param('sss', $id, $name, $hash);
	$stmt->execute();
	$stmt->close();
}

function setup_update_name(string $id, string $name): void {
	global $db;
	$stmt = $db->prepare('UPDATE `setup` SET `name` = ? WHERE `id` = ?');
	$stmt->bind_param('ss', $name, $id);
	$stmt->execute();
	$stmt->close();
}

// place

function place_list(): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name` FROM `place` ORDER BY `name` ASC, `id` ASC');
	return stmt_list($stmt);
}

function place_with_content_list(): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `content`, `top`, `left`, `width` FROM `place`');
	return stmt_list($stmt);
}

function place_station(int $place): ?int {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `station` WHERE `place` = ? ORDER BY `id` LIMIT 1');
	$stmt->bind_param('i', $place);
	return stmt_cell($stmt);
}

// station

// TODO accept multiple players per success

function station_list(): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `capacity`, `place` FROM `station` ORDER BY `name` ASC, `id` ASC');
	return stmt_list($stmt);
}

function station_with_code_list(): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `code`, `capacity`, `place` FROM `station` ORDER BY `name` ASC, `id` ASC');
	return stmt_list($stmt);
}

function station_exists(int $id): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `station` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	return stmt_bool($stmt);
}

function station_matches(int $id, string $code): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `station` WHERE `id` = ? AND `code` = ?');
	$stmt->bind_param('is', $id, $code);
	return stmt_bool($stmt);
}

function station_conqueror(int $station, DT $game_start, DT $game_stop): ?int {
	global $db;
	$game_start = $game_start->to_sql();
	$game_stop = $game_stop->to_sql();
	$stmt = $db->prepare('
	SELECT IF(`success`.`type` = \'conquest\', `player`.`team`, NULL)
	FROM `success`
	LEFT JOIN `player` ON `player`.`id` = `success`.`player`
	WHERE `success`.`station` = ? AND `success`.`dt` >= ? AND `success`.`dt` < ? AND `success`.`type` != \'simple\'
	ORDER BY `success`.`dt` DESC, `success`.`id` DESC
	LIMIT 1
	');
	$stmt->bind_param('iss', $station, $game_start, $game_stop);
	return stmt_cell($stmt);
}

function station_update(int $id, string $name, string $code, int $capacity, ?int $place): void {
	global $db;
	$stmt = $db->prepare('UPDATE `station` SET `name` = ?, `code` = ?, `capacity` = ?, `place` = ? WHERE `id` = ?');
	$stmt->bind_param('ssiii', $name, $code, $capacity, $place, $id);
	$stmt->execute();
	$stmt->close();
}

// team

function team_list(): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `color` FROM `team` ORDER BY `name` ASC, `id` ASC');
	return stmt_list($stmt);
}

function team_with_players_list(): array {
	global $db;
	$stmt = $db->prepare('
	SELECT `team`.`id`, `team`.`name`, `team`.`color`, COUNT(`player`.`id`) AS `players`
	FROM `team`
	LEFT JOIN `player` ON `player`.`team` = `team`.`id`
	GROUP BY `team`.`id`, `team`.`name`
	ORDER BY `team`.`name` ASC, `team`.`id` ASC
	');
	return stmt_list($stmt);
}

function team_exists(int $id): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `team` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	return stmt_bool($stmt);
}

function team_players(int $id): ?int {
	global $db;
	$stmt = $db->prepare('SELECT COUNT(`id`) AS `players` FROM `player` WHERE `team` = ?');
	$stmt->bind_param('i', $id);
	return stmt_cell($stmt);
}

function team_insert(string $name, string $color): void {
	global $db;
	$stmt = $db->prepare('INSERT INTO `team` (`name`, `color`) VALUES (?, ?)');
	$stmt->bind_param('ss', $name, $color);
	$stmt->execute();
	$stmt->close();
}

function team_update(int $id, string $name, string $color): void {
	global $db;
	$stmt = $db->prepare('UPDATE `team` SET `name` = ?, `color` = ? WHERE `id` = ?');
	$stmt->bind_param('ssi', $name, $color, $id);
	$stmt->execute();
	$stmt->close();
}

function team_delete(int $id): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `team` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	$stmt->execute();
	$stmt->close();
}

// player

function player_list(): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `team`, `block` FROM `player` ORDER BY `name` ASC, `id` ASC');
	return array_map(function(array $item): array {
		$item['block'] = boolval($item['block']);
		return $item;
	}, stmt_list($stmt));
}

function player_exists(string $id): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `player` WHERE `id` = ?');
	$stmt->bind_param('s', $id);
	return stmt_bool($stmt);
}

function player_points(DT $game_start, DT $game_stop): array {
	global $db;
	$game_start = $game_start->to_sql();
	$game_stop = $game_stop->to_sql();
	$stmt = $db->prepare('
	SELECT `player`.`id`, `player`.`name`, `player`.`team`, COUNT(`success`.`id`) AS `points`
	FROM `player`
	LEFT JOIN `success` ON `success`.`player` = `player`.`id` AND `success`.`dt` >= ? AND `success`.`dt` < ?
	WHERE NOT `player`.`block`
	GROUP BY `player`.`id`, `player`.`name`, `player`.`team`
	ORDER BY `player`.`name` ASC, `player`.`id` ASC');
	$stmt->bind_param('ss', $game_start, $game_stop);
	return stmt_list($stmt);
}

function player_team(string $id): int {
	global $db;
	$stmt = $db->prepare('SELECT `team` FROM `player` WHERE `id` = ?');
	$stmt->bind_param('s', $id);
	return stmt_cell($stmt);
}

function player_insert(string $id, string $name, int $team, bool $block): void {
	global $db;
	$stmt = $db->prepare('INSERT INTO `player` (`id`, `name`, `team`, `block`) VALUES (?, ?, ?, ?)');
	$stmt->bind_param('ssii', $id, $name, $team, $block);
	$stmt->execute();
	$stmt->close();
}

function player_update(string $player, string $id, string $name, int $team, bool $block): void {
	global $db;
	$stmt = $db->prepare('UPDATE `player` SET `id` = ?, `name` = ?, `team` = ?, `block` = ? WHERE `id` = ?');
	$stmt->bind_param('ssiis', $id, $name, $team, $block, $player);
	$stmt->execute();
	$stmt->close();
}

function player_delete(string $id): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `player` WHERE `id` = ?');
	$stmt->bind_param('s', $id);
	$stmt->execute();
	$stmt->close();
}

function player_truncate(): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `player`');
	$stmt->execute();
	$stmt->close();
}

// success

function success_list(DT $game_start, DT $game_stop): array {
	global $db;
	$game_start = $game_start->to_sql();
	$game_stop = $game_stop->to_sql();
	$stmt = $db->prepare('
	SELECT `id`, `station`, `player`, `type`, `dt` AS `timestamp`
	FROM `success`
	WHERE `dt` >= ? AND `dt` < ?
	ORDER BY `dt` ASC, `id` ASC
	');
	$stmt->bind_param('ss', $game_start, $game_stop);
	$list = stmt_list($stmt);
	return array_map(function(array $item): array {
		$item['timestamp'] = DT::from_sql($item['timestamp'])->to_int();
		return $item;
	}, $list);
}

function success_with_team_list(DT $game_start, DT $game_stop): array {
	global $db;
	$game_start = $game_start->to_sql();
	$game_stop = $game_stop->to_sql();
	$stmt = $db->prepare('
	SELECT `success`.`id`, `success`.`station`, `player`.`team`, `success`.`type`, `success`.`dt` AS `timestamp`
	FROM `success`
	LEFT JOIN `player` ON `player`.`id` = `success`.`player`
	WHERE `success`.`dt` >= ? AND `success`.`dt` < ?
	ORDER BY `timestamp` ASC, `success`.`id` ASC
	');
	$stmt->bind_param('ss', $game_start, $game_stop);
	$list = stmt_list($stmt);
	return array_map(function(array $item): array {
		$item['timestamp'] = DT::from_sql($item['timestamp'])->to_int();
		return $item;
	}, $list);
}

function success_list_by_station(int $station, DT $game_start, DT $game_stop): array {
	global $db;
	$game_start = $game_start->to_sql();
	$game_stop = $game_stop->to_sql();
	$stmt = $db->prepare('
	SELECT `id`, `player`, `type`, `dt` AS `timestamp`
	FROM `success`
	WHERE `station` = ? AND `dt` >= ? AND `dt` < ?
	ORDER BY `timestamp` ASC, `id` ASC
	');
	$stmt->bind_param('iss', $station, $game_start, $game_stop);
	return stmt_list($stmt);
}

function success_latest(int $station): ?int {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `success` WHERE `station` = ? ORDER BY `dt` DESC, `id` DESC LIMIT 1');
	$stmt->bind_param('i', $station);
	return stmt_cell($stmt);
}

function success_insert(int $station, string $player, string $type, DT $dt): void {
	global $db;
	$dt = $dt->to_sql();
	$stmt = $db->prepare('INSERT INTO `success` (`station`, `player`, `type`, `dt`) VALUES (?, ?, ?, ?)');
	$stmt->bind_param('isss', $station, $player, $type, $dt);
	$stmt->execute();
	$stmt->close();
}

function success_delete(int $id): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `success` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	$stmt->execute();
	$stmt->close();
}

function success_truncate(): void {
	global $db;
	$stmt = $db->prepare('TRUNCATE `success`');
	$stmt->execute();
	$stmt->close();
}

// api

function json(mixed $mixed): void {
	header('content-type: application/json; charset=utf-8');
	exit(json_encode($mixed));
}

require_once 'request.php';

function is_get(string $action): bool {
	return $_SERVER['REQUEST_METHOD'] === 'GET' && get_string_nullable('action') === $action;
}

function is_post(string $action): bool {
	return $_SERVER['REQUEST_METHOD'] === 'POST' && get_string_nullable('action') === $action;
}

if (is_get('app_name')) {
	json(APP_NAME);
}

if (is_post('setup_register')) {
	$id = post_slug('id');
	if (setup_exists($id))
		json(NULL);
	$name = post_string_nullable('name');
	$password = post_string('password');
	setup_insert($id, $name, $password);
	json([
		'setup' => setup_select_by_id($id),
	]);
}

if (is_post('setup_login')) {
	$id = post_slug('id');
	if (!setup_exists($id))
		json('id');
	$password = post_string('password');
	if (!setup_matches($id, $password))
		json('password');
	json([
		'setup' => setup_select_by_id($id),
	]);
}

if (is_post('setup_update_name')) {
	$id = post_slug('id');
	$password = post_string('password');
	$name = post_string_nullable('name');
	if (!setup_matches($id, $password))
		exit('password');
	setup_update_name($id, $name);
	json([
		'setup' => setup_select_by_id($id),
	]);
}

if (is_post('admin_login')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		json(NULL);
	json([
		'game_start' => config_get_game_start()->to_js(),
		'game_stop' => config_get_game_stop()->to_js(),
		'reward_success' => config_get_reward_success(),
		'reward_conquest' => config_get_reward_conquest(),
		'reward_rate' => config_get_reward_rate(),
		'place_list' => place_list(),
		'station_list'=> station_with_code_list(),
		'team_list' => team_list(),
		'player_list' => player_list(),
	]);
}

if (is_post('admin_config')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		exit('password');
	$game_start = post_string('game_start');
	$game_start = DT::from_js($game_start);
	$game_stop = post_string('game_stop');
	$game_stop = DT::from_js($game_stop);
	if ($game_stop->to_int() < $game_start->to_int())
		exit('game_stop');
	$reward_success = post_int('reward_success');
	if ($reward_success < 0)
		exit('reward_success');
	$reward_conquest = post_int('reward_conquest');
	if ($reward_conquest < 0)
		exit('reward_conquest');
	$reward_rate = post_float('reward_rate');
	if ($reward_rate < 0)
		exit('reward_rate');
	config_set('game_start', $game_start->to_int());
	config_set('game_stop', $game_stop->to_int());
	config_set('reward_success', $reward_success);
	config_set('reward_conquest', $reward_conquest);
	config_set('reward_rate', $reward_rate);
	json(NULL);
}

if (is_post('station_update')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		exit('password');
	$id = post_int('id');
	if (!station_exists($id))
		exit('id');
	$name = post_string('name');
	$code = post_string('code');
	$capacity = post_int('capacity');
	if ($capacity <= 0)
		exit('capacity');
	$place = post_int_nullable('place');
	$station_by_place = !is_null($place) ? place_station($place) : NULL;
	if (!is_null($place) && !is_null($station_by_place) && $id !== $station_by_place)
		exit('place');
	station_update($id, $name, $code, $capacity, $place);
	json([
		'station_list' => station_with_code_list(),
	]);
}

if (is_post('team_insert')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		exit('password');
	$name = post_string('name');
	$color = post_string('color');
	team_insert($name, $color);
	json([
		'team_list' => team_list(),
	]);
}

if (is_post('team_update')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		exit('password');
	$id = post_int('id');
	if (!team_exists($id))
		exit('id');
	$name = post_string('name');
	$color = post_string('color');
	team_update($id, $name, $color);
	json([
		'team_list' => team_list(),
	]);
}

if (is_post('team_delete')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		exit('password');
	$id = post_int('id');
	if (!team_exists($id))
		exit('id');
	if (team_players($id) !== 0)
		exit('id');
	team_delete($id);
	json([
		'team_list' => team_list(),
	]);
}

if (is_post('player_insert')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		exit('password');
	$id = post_string('id');
	if (player_exists($id))
		json(NULL);
	$name = post_string('name');
	$team = post_int('team');
	if (!team_exists($team))
		exit('team');
	player_insert($id, $name, $team, FALSE);
	json([
		'player_list' => player_list(),
	]);
}

if (is_post('player_update')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		exit('password');
	$player = post_string('player');
	if (!player_exists($player))
		exit('player');
	$id = post_string('id');
	if ($id !== $player && player_exists($id))
		json(NULL);
	$name = post_string('name');
	$team = post_int('team');
	if (!team_exists($team))
		exit('team');
	$block = boolval(post_int('block'));
	player_update($player, $id, $name, $team, $block);
	json([
		'player_list' => player_list(),
	]);
}

if (is_post('player_delete')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		exit('password');
	$id = post_string('id');
	if (!player_exists($id))
		exit('id');
	player_delete($id);
	json([
		'player_list' => player_list(),
	]);
}

if (is_post('player_import')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		exit('password');
	$text = post_string('text');
	$player_list = mb_split('\r\n|\r|\n', $text);
	if ($player_list === FALSE)
		json(NULL);
	$team_dict = team_list(); // NOTE name column of team table does not have a unique constraint
	$team_dict = array_combine(array_column($team_dict, 'name'), array_column($team_dict, 'id'));
	$player_list = array_map(function(string $player) use ($team_dict): ?array {
		$player = mb_split('\t', $player);
		if ($player === FALSE)
			json(NULL);
		if (count($player) === 1 && $player[0] === '')
			return NULL;
		if (count($player) !== 3)
			json(NULL);
		$player = array_combine(['id', 'name', 'team'], $player);
		if (empty($player['id']))
			json(NULL);
		if (empty($player['name']))
			json(NULL);
		$team = $player['team'];
		if (!isset($team_dict[$team]))
			json(NULL);
		$player['team'] = $team_dict[$team];
		return $player;
	}, $player_list);
	$player_list = array_filter($player_list, function(?array $player): bool {
		return !is_null($player);
	});
	if (count(array_unique(array_column($player_list, 'id'))) !== count($player_list))
		json(NULL);
	success_truncate();
	player_truncate();
	foreach ($player_list as $player)
		player_insert($player['id'], $player['name'], $player['team'], FALSE);
	json([
		'player_list' => player_list(),
	]);
}

if (is_post('success_truncate')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		exit('password');
	success_truncate();
	json(NULL);
}

if (is_get('station_list')) {
	json([
		'station_list' => station_list(),
	]);
}

if (is_post('station_login')) {
	$station = post_int('station');
	$password = post_string('password');
	if (!station_matches($station, $password))
		json(NULL);
	$game_start = config_get_game_start();
	$game_stop = config_get_game_stop();
	$now = DT::from_now();
	json([
		'game_start' => $game_start->to_sql(),
		'game_stop' => $game_stop->to_sql(),
		'station_list' => station_list(),
		'team_list' => team_list(),
		'player_list' => player_list(),
		'success_list' => success_list_by_station($station, $game_start, $game_stop),
	]);
}

if (is_post('success_insert')) {
	$station = post_int('station');
	$password = post_string('password');
	if (!station_matches($station, $password))
		exit('credentials');
	$type = post_string('type');
	if (!in_array($type, ['simple', 'neutralization', 'conquest'], TRUE))
		exit('type');
	$player = post_string('player');
	if (!player_exists($player))
		exit('player');
	$game_start = config_get_game_start();
	$game_stop = config_get_game_stop();
	$now = DT::from_now();
	$game_state = get_game_state($now, $game_start, $game_stop);
	if ($game_state !== 'running')
		json($game_state);
	$team = player_team($player);
	$conqueror = station_conqueror($station, $game_start, $game_stop);
	if ($type === 'neutralization' && (is_null($conqueror) || $team === $conqueror))
		exit('type');
	if ($type === 'conquest' && $team === $conqueror)
		exit('type');
	success_insert($station, $player, $type, $now);
	json([
		'game_start' => $game_start->to_sql(),
		'game_stop' => $game_stop->to_sql(),
		'station_list' => station_list(),
		'team_list' => team_list(),
		'player_list' => player_list(),
		'success_list' => success_list_by_station($station, $game_start, $game_stop),
	]);
}

if (is_post('success_delete')) {
	$station = post_int('station');
	$password = post_string('password');
	if (!station_matches($station, $password))
		exit('credentials');
	$id = post_int('id');
	if (success_latest($station) !== $id)
		exit('id');
	success_delete($id);
	$game_start = config_get_game_start();
	$game_stop = config_get_game_stop();
	$now = DT::from_now();
	json([
		'game_start' => $game_start->to_sql(),
		'game_stop' => $game_stop->to_sql(),
		'station_list' => station_list(),
		'team_list' => team_list(),
		'player_list' => player_list(),
		'success_list' => success_list_by_station($station, $game_start, $game_stop),
	]);
}

if (is_get('map')) {
	json([
		'place_list' => place_with_content_list(),
	]);
}

if (is_get('game')) {
	$game_start = config_get_game_start();
	$game_stop = config_get_game_stop();
	$now = DT::from_now();
	$game_state = get_game_state($now, $game_start, $game_stop);
	if ($game_state === 'pending')
		$timestamp = $game_start->to_int();
	elseif ($game_state === 'finished')
		$timestamp = $game_stop->to_int();
	else
		$timestamp = $now->to_int();
	json([
		'time_start' => $game_start->to_int(),
		'time_stop' => $game_stop->to_int(),
		'time_now' => $now->to_int(),
		'reward_success' => config_get_reward_success(),
		'reward_conquest' => config_get_reward_conquest(),
		'reward_rate' => config_get_reward_rate(),
		'station_list' => station_list(),
		'team_list' => team_with_players_list(),
		'success_list' => success_with_team_list($game_start, $game_stop),
	]);
}

if (is_post('inspect')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		exit('password');
	$game_start = config_get_game_start();
	$game_stop = config_get_game_stop();
	json([
		'game_start' => $game_start->to_int(),
		'station_list' => station_list(),
		'team_list' => team_list(),
		'player_list' => player_list(),
		'success_list' => success_list($game_start, $game_stop),
	]);
}

if (is_post('draw')) {
	$password = post_string('password');
	if ($password !== ADMIN_PASS)
		exit('password');
	$game_start = config_get_game_start();
	$game_stop = config_get_game_stop();
	json([
		'team_list' => team_list(),
		'player_list' => player_points($game_start, $game_stop),
	]);
}
