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

// file system

function check_file(string $file_name, string $mime_type, int $max_size): bool {
	// file_name
	if (!file_exists($file_name))
		exit('check_file: file_exists');
	if (!is_file($file_name))
		exit('check_file: is_file');
	// mime_type
	if ($mime_type !== 'image')
		exit('check_file: mime_type');
	$type = mime_content_type($file_name);
	if ($type === FALSE)
		exit('check_file: mime_content_type');
	if (!str_starts_with($type, $mime_type . '/'))
		return FALSE;
	// max_size
	$size = filesize($file_name);
	if ($size === FALSE)
		exit('check_file: filesize');
	if ($size > $max_size)
		return FALSE;
	return TRUE;
}

function move_file(string $temp_path, string $upload_dir, string $file_name): string {
	// temp_path
	if (!is_uploaded_file($temp_path))
		exit('move_file: temp_path');
	// upload_dir
	if ($upload_dir !== 'maps')
		exit('move_file: upload_dir');
	// file_name
	if ($file_name !== basename($file_name))
		exit('move_file: file_name');
	if (str_starts_with($file_name, '.'))
		exit('move_file: file_name');
	// run
	$file_path = sprintf('%s/%s', $upload_dir, $file_name);
	if (!file_exists($upload_dir)) {
		if (mkdir($upload_dir) === FALSE)
			exit('move_file: mkdir');
	} elseif (!is_dir($upload_dir)) {
		exit('move_file: is_dir');
	}
	if (move_uploaded_file($temp_path, $file_path) === FALSE)
		exit('move_file: move_uploaded_file');
	return $file_path;
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

// game

function game_select_by_id(string $id): ?array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `map` FROM `game` WHERE `id` = ?');
	$stmt->bind_param('s', $id);
	return stmt_item($stmt);
}

function game_exists(string $id): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `game` WHERE `id` = ?');
	$stmt->bind_param('s', $id);
	return stmt_bool($stmt);
}

function game_matches(string $id, string $password): bool {
	global $db;
	$stmt = $db->prepare('SELECT `hash` FROM `game` WHERE `id` = ?');
	$stmt->bind_param('s', $id);
	$hash = stmt_cell($stmt);
	if (is_null($hash))
		return FALSE;
	return password_verify($password, $hash);
}

function game_insert(string $id, ?string $name, string $password): void {
	global $db;
	$hash = password_hash($password, PASSWORD_DEFAULT);
	$stmt = $db->prepare('INSERT INTO `game` (`id`, `name`, `hash`) VALUES (?, ?, ?)');
	$stmt->bind_param('sss', $id, $name, $hash);
	$stmt->execute();
	$stmt->close();
}

function game_update_name(string $id, ?string $name): void {
	global $db;
	$stmt = $db->prepare('UPDATE `game` SET `name` = ? WHERE `id` = ?');
	$stmt->bind_param('ss', $name, $id);
	$stmt->execute();
	$stmt->close();
}

function game_update_map(string $id, ?string $map): void {
	global $db;
	$stmt = $db->prepare('UPDATE `game` SET `map` = ? WHERE `id` = ?');
	$stmt->bind_param('ss', $map, $id);
	$stmt->execute();
	$stmt->close();
}

// polygon

function polygon_select_by_game(string $game): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `content` FROM `polygon` WHERE `game` = ? ORDER BY `name` ASC, `id` ASC');
	$stmt->bind_param('s', $game);
	return stmt_list($stmt);
}

function polygon_belongs_to_game(int $id, string $game): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `polygon` WHERE `id` = ? AND `game` = ?');
	$stmt->bind_param('is', $id, $game);
	return stmt_bool($stmt);
}

function polygon_count_stations(int $id): int {
	global $db;
	$stmt = $db->prepare('SELECT COUNT(`id`) FROM `station2` WHERE `polygon` = ?');
	$stmt->bind_param('i', $id);
	return stmt_cell($stmt);
}

function polygon_insert(string $name, ?string $content, string $game): void {
	global $db;
	$stmt = $db->prepare('INSERT INTO `polygon` (`name`, `content`, `game`) VALUES (?, ?, ?)');
	$stmt->bind_param('sss', $name, $content, $game);
	$stmt->execute();
	$stmt->close();
}

function polygon_update(int $id, string $name, ?string $content): void {
	global $db;
	$stmt = $db->prepare('UPDATE `polygon` SET `name` = ?, `content` = ? WHERE `id` = ?');
	$stmt->bind_param('ssi', $name, $content, $id);
	$stmt->execute();
	$stmt->close();
}

function polygon_delete(int $id): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `polygon` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	$stmt->execute();
	$stmt->close();
}

// station2

function station2_select_by_game(string $game): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `code`, `capacity`, `polygon` FROM `station2` WHERE `game` = ? ORDER BY `name` ASC, `id` ASC');
	$stmt->bind_param('s', $game);
	return stmt_list($stmt);
}

function station2_belongs_to_game(int $id, string $game): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `station2` WHERE `id` = ? AND `game` = ?');
	$stmt->bind_param('is', $id, $game);
	return stmt_bool($stmt);
}

function station2_identify_by_polygon(int $polygon): ?int {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `station2` WHERE `polygon` = ? LIMIT 1');
	$stmt->bind_param('i', $polygon);
	return stmt_cell($stmt);
}

function station2_insert(string $name, string $code, int $capacity, ?int $polygon, string $game): void {
	global $db;
	$stmt = $db->prepare('INSERT INTO `station2` (`name`, `code`, `capacity`, `polygon`, `game`) VALUES (?, ?, ?, ?, ?)');
	$stmt->bind_param('ssiis', $name, $code, $capacity, $polygon, $game);
	$stmt->execute();
	$stmt->close();
}

function station2_update(int $id, string $name, string $code, int $capacity, ?int $polygon): void {
	global $db;
	$stmt = $db->prepare('UPDATE `station2` SET `name` = ?, `code` = ?, `capacity` = ?, `polygon` = ? WHERE `id` = ?');
	$stmt->bind_param('ssiii', $name, $code, $capacity, $polygon, $id);
	$stmt->execute();
	$stmt->close();
}

function station2_delete(int $id): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `station2` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	$stmt->execute();
	$stmt->close();
}

// team2

function team2_select_by_game(string $game): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `background_color`, `text_color` FROM `team2` WHERE `game` = ? ORDER BY `name` ASC, `id` ASC');
	$stmt->bind_param('s', $game);
	return stmt_list($stmt);
}

function team2_belongs_to_game(int $id, string $game): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `team2` WHERE `id` = ? AND `game` = ?');
	$stmt->bind_param('is', $id, $game);
	return stmt_bool($stmt);
}

function team2_identify_by_name(string $name, string $game): ?int {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `team2` WHERE `name` = ? AND `game` = ? LIMIT 1');
	$stmt->bind_param('ss', $name, $game);
	return stmt_cell($stmt);
}

function team2_count_players(int $id): int {
	global $db;
	$stmt = $db->prepare('SELECT COUNT(`id`) FROM `player2` WHERE `team` = ?');
	$stmt->bind_param('i', $id);
	return stmt_cell($stmt);
}

function team2_insert(string $name, string $background_color, string $text_color, string $game): void {
	global $db;
	$stmt = $db->prepare('INSERT INTO `team2` (`name`, `background_color`, `text_color`, `game`) VALUES (?, ?, ?, ?)');
	$stmt->bind_param('ssss', $name, $background_color, $text_color, $game);
	$stmt->execute();
	$stmt->close();
}

function team2_update(int $id, string $name, string $background_color, string $text_color): void {
	global $db;
	$stmt = $db->prepare('UPDATE `team2` SET `name` = ?, `background_color` = ?, `text_color` = ? WHERE `id` = ?');
	$stmt->bind_param('sssi', $name, $background_color, $text_color, $id);
	$stmt->execute();
	$stmt->close();
}

function team2_delete(int $id): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `team2` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	$stmt->execute();
	$stmt->close();
}

// player2

function player2_select_by_game(string $game): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `mark`, `team` FROM `player2` WHERE `game` = ? ORDER BY `name` ASC, `id` ASC');
	$stmt->bind_param('s', $game);
	return stmt_list($stmt);
}

function player2_belongs_to_game(int $id, string $game): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `player2` WHERE `id` = ? AND `game` = ?');
	$stmt->bind_param('is', $id, $game);
	return stmt_bool($stmt);
}

function player2_identify_by_mark(string $mark, string $game): ?int {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `player2` WHERE `mark` = ? AND `game` = ? LIMIT 1');
	$stmt->bind_param('ss', $mark, $game);
	return stmt_cell($stmt);
}

function player2_insert(string $name, string $mark, ?int $team, string $game): void {
	global $db;
	$stmt = $db->prepare('INSERT INTO `player2` (`name`, `mark`, `team`, `game`) VALUES (?, ?, ?, ?)');
	$stmt->bind_param('ssis', $name, $mark, $team, $game);
	$stmt->execute();
	$stmt->close();
}

function player2_update(int $id, string $name, string $mark, ?int $team): void {
	global $db;
	$stmt = $db->prepare('UPDATE `player2` SET `name` = ?, `mark` = ?, `team` = ? WHERE `id` = ?');
	$stmt->bind_param('ssii', $name, $mark, $team, $id);
	$stmt->execute();
	$stmt->close();
}

function player2_delete(int $id): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `player2` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	$stmt->execute();
	$stmt->close();
}

function player2_truncate(string $game): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `player2` WHERE `game` = ?');
	$stmt->bind_param('s', $game);
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

if (is_post('game_register')) {
	$id = post_slug('id');
	if (game_exists($id))
		json(NULL);
	$name = post_string_nullable('name');
	$password = post_string('password');
	game_insert($id, $name, $password);
	json([
		'game' => game_select_by_id($id),
		'polygon_list' => polygon_select_by_game($id),
		'station_list' => station2_select_by_game($id),
		'team_list' => team2_select_by_game($id),
		'player_list' => player2_select_by_game($id),
	]);
}

if (is_post('game_login')) {
	$id = post_slug('id');
	if (!game_exists($id))
		json('id');
	$password = post_string('password');
	if (!game_matches($id, $password))
		json('password');
	json([
		'game' => game_select_by_id($id),
		'polygon_list' => polygon_select_by_game($id),
		'station_list' => station2_select_by_game($id),
		'team_list' => team2_select_by_game($id),
		'player_list' => player2_select_by_game($id),
	]);
}

// TODO manage game: delete, clone, change password

if (is_post('game_update_name')) {
	$id = post_slug('id');
	$password = post_string('password');
	if (!game_matches($id, $password))
		exit('password');
	$name = post_string_nullable('name');
	game_update_name($id, $name);
	json(game_select_by_id($id));
}

if (is_post('game_insert_map')) {
	$id = post_slug('id');
	$password = post_string('password');
	if (!game_matches($id, $password))
		exit('password');
	$game = game_select_by_id($id);
	if (!is_null($game['map']))
		exit('id');
	$map = post_file('map');
	if (!check_file($map['tmp_name'], 'image', 256 * 1024))
		exit('map');
	$map = move_file($map['tmp_name'], 'maps', sprintf('%s-%d.%s', $id, time(), pathinfo($map['name'], PATHINFO_EXTENSION)));
	game_update_map($id, $map);
	json(game_select_by_id($id));
}

if (is_post('game_delete_map')) {
	$id = post_slug('id');
	$password = post_string('password');
	if (!game_matches($id, $password))
		exit('password');
	$game = game_select_by_id($id);
	if (is_null($game['map']))
		exit('id');
	if (unlink($game['map']) === FALSE)
		exit('unlink');
	game_update_map($id, NULL);
	json(game_select_by_id($id));
}

if (is_post('polygon_insert')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$name = post_string('name');
	$content = post_string_nullable('content');
	polygon_insert($name, $content, $game);
	json(polygon_select_by_game($game));
}

if (is_post('polygon_update')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!polygon_belongs_to_game($id, $game))
		exit('id');
	$name = post_string('name');
	$content = post_string_nullable('content');
	polygon_update($id, $name, $content);
	json(polygon_select_by_game($game));
}

if (is_post('polygon_delete')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!polygon_belongs_to_game($id, $game))
		exit('id');
	if (polygon_count_stations($id) !== 0)
		exit('id');
	polygon_delete($id);
	json(polygon_select_by_game($game));
}

if (is_post('station2_insert')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$name = post_string('name');
	$code = post_string('code');
	$capacity = post_int('capacity');
	if ($capacity <= 0)
		exit('capacity');
	$polygon = post_int_nullable('polygon');
	if (!is_null($polygon)) {
		if (!polygon_belongs_to_game($polygon, $game))
			exit('polygon');
		if (!is_null(station2_identify_by_polygon($polygon)))
			exit('polygon');
	}
	station2_insert($name, $code, $capacity, $polygon, $game);
	json(station2_select_by_game($game));
}

if (is_post('station2_update')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!station2_belongs_to_game($id, $game))
		exit('id');
	$name = post_string('name');
	$code = post_string('code');
	$capacity = post_int('capacity');
	if ($capacity <= 0)
		exit('capacity');
	$polygon = post_int_nullable('polygon');
	if (!is_null($polygon)) {
		if (!polygon_belongs_to_game($polygon, $game))
			exit('polygon');
		$station = station2_identify_by_polygon($polygon);
		if (!is_null($station) && $station !== $id)
			exit('polygon');
	}
	station2_update($id, $name, $code, $capacity, $polygon);
	json(station2_select_by_game($game));
}

if (is_post('station2_delete')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!station2_belongs_to_game($id, $game))
		exit('id');
	station2_delete($id);
	json(station2_select_by_game($game));
}

if (is_post('team2_insert')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$name = post_string('name');
	if (!is_null(team2_identify_by_name($name, $game)))
		json(NULL);
	$background_color = post_string('background_color');
	$text_color = post_string('text_color');
	team2_insert($name, $background_color, $text_color, $game);
	json(team2_select_by_game($game));
}

if (is_post('team2_update')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!team2_belongs_to_game($id, $game))
		exit('id');
	$name = post_string('name');
	$team = team2_identify_by_name($name, $game);
	if (!is_null($team) && $team !== $id)
		json(NULL);
	$background_color = post_string('background_color');
	$text_color = post_string('text_color');
	team2_update($id, $name, $background_color, $text_color);
	json(team2_select_by_game($game));
}

if (is_post('team2_delete')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!team2_belongs_to_game($id, $game))
		exit('id');
	if (team2_count_players($id) !== 0)
		exit('id');
	team2_delete($id);
	json(team2_select_by_game($game));
}

if (is_post('player2_insert')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$name = post_string('name');
	$mark = post_string('mark');
	if (!is_null(player2_identify_by_mark($mark, $game)))
		json(NULL);
	$team = post_int_nullable('team');
	if (!is_null($team) && !team2_belongs_to_game($team, $game))
		exit('team');
	player2_insert($name, $mark, $team, $game);
	json(player2_select_by_game($game));
}

if (is_post('player2_update')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!player2_belongs_to_game($id, $game))
		exit('id');
	$name = post_string('name');
	$mark = post_string('mark');
	$player = player2_identify_by_mark($mark, $game);
	if (!is_null($player) && $player !== $id)
		json(NULL);
	$team = post_int_nullable('team');
	if (!is_null($team) && !team2_belongs_to_game($team, $game))
		exit('team');
	player2_update($id, $name, $mark, $team);
	json(player2_select_by_game($game));
}

if (is_post('player2_delete')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!player2_belongs_to_game($id, $game))
		exit('id');
	player2_delete($id);
	json(player2_select_by_game($game));
}

if (is_post('player2_import')) {
	$game = post_slug('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$text = post_string('text');
	$line_list = mb_split('\r\n|\r|\n', $text);
	if ($line_list === FALSE)
		exit('text');
	$mark_list = []; // NOTE /Ds/Set is not available
	$line_list = array_map(function(string $line) use ($game, &$mark_list): null|string|array {
		$line = mb_split('\t', $line);
		if ($line === FALSE)
			exit('text');
		if (count($line) === 1 && $line[0] === '')
			return NULL;
		if (count($line) !== 3)
			return 'Wrong number of columns.';
		$mark = $line[0];
		$name = $line[1];
		$team = $line[2];
		if (mb_strlen($mark) === 0)
			return 'Player mark is empty.';
		if (in_array($mark, $mark_list, TRUE))
			return 'Player mark is not available.';
		$mark_list[] = $mark;
		if (mb_strlen($name) === 0)
			return 'Player name is empty.';
		if (mb_strlen($team) === 0) {
			$team = NULL;
		} else {
			$team = team2_identify_by_name($team, $game);
			if (is_null($team))
				return 'Player team not found.';
		}
		return [
			'name' => $name,
			'mark' => $mark,
			'team' => $team,
		];
	}, $line_list);
	$player_list = [];
	foreach ($line_list as $line_number => $line) {
		if (is_null($line))
			continue;
		if (is_string($line)) {
			json([
				'error' => $line,
				'line' => $line_number + 1,
			]);
		}
		$player_list[] = $line;
	}
	player2_truncate($game);
	foreach ($player_list as $player)
		player2_insert($player['name'], $player['mark'], $player['team'], $game);
	json(player2_select_by_game($game));
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

exit('action');
