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

// game

function game_select_by_id(int $id): ?array {
	global $db;
	$stmt = $db->prepare('
	SELECT `id`, `name`, `title`, `game_start`, `game_stop`, `reward_success`, `reward_conquest`, `reward_rate`, `map`, `css`, `translation`
	FROM `game`
	WHERE `id` = ?
	');
	$stmt->bind_param('i', $id);
	$item = stmt_item($stmt);
	if (is_null($item))
		return NULL;
	$item['game_start_js'] = DT::from_int($item['game_start'])->to_js();
	$item['game_stop_js'] = DT::from_int($item['game_stop'])->to_js();
	return $item;
}

function game_identify_by_name(string $name): ?int {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `game` WHERE `name` = ?');
	$stmt->bind_param('s', $name);
	return stmt_cell($stmt);
}

function game_matches(int $id, string $password): bool {
	global $db;
	$stmt = $db->prepare('SELECT `hash` FROM `game` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	$hash = stmt_cell($stmt);
	if (is_null($hash))
		return FALSE;
	return password_verify($password, $hash);
}

function game_get_start(int $id): ?DT {
	global $db;
	$stmt = $db->prepare('SELECT `game_start` FROM `game` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	$cell = stmt_cell($stmt);
	if (is_null($cell))
		return NULL;
	return DT::from_int($cell);
}

function game_get_stop(int $id): ?DT {
	global $db;
	$stmt = $db->prepare('SELECT `game_stop` FROM `game` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	$cell = stmt_cell($stmt);
	if (is_null($cell))
		return NULL;
	return DT::from_int($cell);
}

function game_insert(
	string $name, ?string $title, string $password,
	DT $game_start, DT $game_stop,
	int $reward_success, int $reward_conquest, float $reward_rate,
): int {
	global $db;
	$hash = password_hash($password, PASSWORD_DEFAULT);
	$game_start = $game_start->to_int();
	$game_stop = $game_stop->to_int();
	$stmt = $db->prepare('
	INSERT INTO `game` (`name`, `title`, `hash`, `game_start`, `game_stop`, `reward_success`, `reward_conquest`, `reward_rate`)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	');
	$stmt->bind_param('sssiiiid', $name, $title, $hash, $game_start, $game_stop, $reward_success, $reward_conquest, $reward_rate);
	$stmt->execute();
	$id = $stmt->insert_id;
	$stmt->close();
	return $id;
}

function game_update(
	int $id, ?string $title,
	DT $game_start, DT $game_stop,
	int $reward_success, int $reward_conquest, float $reward_rate,
	?string $css, ?string $translation,
): void {
	global $db;
	$game_start = $game_start->to_int();
	$game_stop = $game_stop->to_int();
	$stmt = $db->prepare('
	UPDATE `game`
	SET `title` = ?, `game_start` = ?, `game_stop` = ?,
		`reward_success` = ?, `reward_conquest` = ?, `reward_rate` = ?,
		`css` = ?, `translation` = ?
	WHERE `id` = ?
	');
	$stmt->bind_param('siiiidssi', $title, $game_start, $game_stop, $reward_success, $reward_conquest, $reward_rate, $css, $translation, $id);
	$stmt->execute();
	$stmt->close();
}

function game_map_update(int $id, ?string $map): void {
	global $db;
	$stmt = $db->prepare('UPDATE `game` SET `map` = ? WHERE `id` = ?');
	$stmt->bind_param('si', $map, $id);
	$stmt->execute();
	$stmt->close();
}

function game_password_update(int $id, string $password): void {
	global $db;
	$hash = password_hash($password, PASSWORD_DEFAULT);
	$stmt = $db->prepare('UPDATE `game` SET `hash` = ? WHERE `id` = ?');
	$stmt->bind_param('si', $hash, $id);
	$stmt->execute();
	$stmt->close();
}

// polygon

function polygon_select_by_game(int $game): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `content` FROM `polygon` WHERE `game` = ? ORDER BY `name` ASC, `id` ASC');
	$stmt->bind_param('i', $game);
	return stmt_list($stmt);
}

function polygon_belongs_to_game(int $id, int $game): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `polygon` WHERE `id` = ? AND `game` = ?');
	$stmt->bind_param('ii', $id, $game);
	return stmt_bool($stmt);
}

function polygon_count_stations(int $id): int {
	global $db;
	$stmt = $db->prepare('SELECT COUNT(`id`) FROM `station` WHERE `polygon` = ?');
	$stmt->bind_param('i', $id);
	return stmt_cell($stmt);
}

function polygon_insert(string $name, ?string $content, int $game): void {
	global $db;
	$stmt = $db->prepare('INSERT INTO `polygon` (`name`, `content`, `game`) VALUES (?, ?, ?)');
	$stmt->bind_param('ssi', $name, $content, $game);
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

// station

function station_select_by_game(int $game, bool $sensitive = FALSE): array {
	global $db;
	$stmt = $db->prepare('
	SELECT `id`, `name`, IF(?, `code`, \'\') AS `code`, `polygon`, `capacity`, `score_sign`, `score_base`, `score_high`
	FROM `station`
	WHERE `game` = ? ORDER BY `name` ASC, `id` ASC
	');
	$stmt->bind_param('ii', $sensitive, $game);
	return stmt_list($stmt);
}

function station_belongs_to_game(int $id, int $game): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `station` WHERE `id` = ? AND `game` = ?');
	$stmt->bind_param('ii', $id, $game);
	return stmt_bool($stmt);
}

function station_matches(int $id, string $code): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `station` WHERE `id` = ? AND `code` = ?');
	$stmt->bind_param('is', $id, $code);
	return stmt_bool($stmt);
}

function station_identify_by_polygon(int $polygon): ?int {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `station` WHERE `polygon` = ? LIMIT 1');
	$stmt->bind_param('i', $polygon);
	return stmt_cell($stmt);
}

function station_get_capacity(int $id): ?int {
	global $db;
	$stmt = $db->prepare('SELECT `capacity` FROM `station` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	return stmt_cell($stmt);
}

function station_count_attempts(int $id): int {
	global $db;
	$stmt = $db->prepare('SELECT COUNT(`id`) FROM `attempt` WHERE `station` = ?');
	$stmt->bind_param('i', $id);
	return stmt_cell($stmt);
}

function station_insert(
	string $name, string $code, ?int $polygon,
	int $capacity, bool $score_sign, ?int $score_base, ?int $score_high, int $game,
): void {
	global $db;
	$stmt = $db->prepare('
	INSERT INTO `station` (`name`, `code`, `polygon`, `capacity`, `score_sign`, `score_base`, `score_high`, `game`)
	VALUES (?, ?, ?, ?, ?)
	');
	$stmt->bind_param('ssiiiiii', $name, $code, $polygon, $capacity, $score_sign, $score_base, $score_high, $game);
	$stmt->execute();
	$stmt->close();
}

function station_update(
	int $id, string $name, string $code, ?int $polygon,
	int $capacity, bool $score_sign, ?int $score_base, ?int $score_high,
): void {
	global $db;
	$stmt = $db->prepare('
	UPDATE `station`
	SET `name` = ?, `code` = ?, `polygon` = ?, `capacity` = ?, `score_sign` = ?, `score_base` = ?, `score_high` = ?
	WHERE `id` = ?
	');
	$stmt->bind_param('ssiiiiii', $name, $code, $polygon, $capacity, $score_sign, $score_base, $score_high, $id);
	$stmt->execute();
	$stmt->close();
}

function station_delete(int $id): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `station` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	$stmt->execute();
	$stmt->close();
}

// team

function team_select_by_game(int $game): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `background_color`, `text_color` FROM `team` WHERE `game` = ? ORDER BY `name` ASC, `id` ASC');
	$stmt->bind_param('i', $game);
	return stmt_list($stmt);
}

function team_select_by_game_with_players(int $game): array {
	global $db;
	$stmt = $db->prepare('
	SELECT `team`.`id`, `team`.`name`, `team`.`background_color`, `team`.`text_color`, COUNT(`player`.`id`) AS `players`
	FROM `team`
	LEFT JOIN `player` ON `player`.`team` = `team`.`id`
	WHERE `team`.`game` = ?
	GROUP BY `team`.`id`
	ORDER BY `team`.`name` ASC, `team`.`id` ASC
	');
	$stmt->bind_param('i', $game);
	return stmt_list($stmt);
}

function team_belongs_to_game(int $id, int $game): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `team` WHERE `id` = ? AND `game` = ?');
	$stmt->bind_param('ii', $id, $game);
	return stmt_bool($stmt);
}

function team_identify_by_name(string $name, int $game): ?int {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `team` WHERE `name` = ? AND `game` = ? LIMIT 1');
	$stmt->bind_param('si', $name, $game);
	return stmt_cell($stmt);
}

function team_count_players(int $id): int {
	global $db;
	$stmt = $db->prepare('SELECT COUNT(`id`) FROM `player` WHERE `team` = ?');
	$stmt->bind_param('i', $id);
	return stmt_cell($stmt);
}

function team_count_attempts(int $id): int {
	global $db;
	$stmt = $db->prepare('SELECT COUNT(`id`) FROM `attempt` WHERE `team` = ?');
	$stmt->bind_param('i', $id);
	return stmt_cell($stmt);
}

function team_insert(string $name, string $background_color, string $text_color, int $game): void {
	global $db;
	$stmt = $db->prepare('INSERT INTO `team` (`name`, `background_color`, `text_color`, `game`) VALUES (?, ?, ?, ?)');
	$stmt->bind_param('sssi', $name, $background_color, $text_color, $game);
	$stmt->execute();
	$stmt->close();
}

function team_update(int $id, string $name, string $background_color, string $text_color): void {
	global $db;
	$stmt = $db->prepare('UPDATE `team` SET `name` = ?, `background_color` = ?, `text_color` = ? WHERE `id` = ?');
	$stmt->bind_param('sssi', $name, $background_color, $text_color, $id);
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

function player_select_by_game(int $game): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `name`, `mark`, `team` FROM `player` WHERE `game` = ? ORDER BY `name` ASC, `id` ASC');
	$stmt->bind_param('i', $game);
	return stmt_list($stmt);
}

function player_belongs_to_game(int $id, int $game): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `player` WHERE `id` = ? AND `game` = ?');
	$stmt->bind_param('ii', $id, $game);
	return stmt_bool($stmt);
}

function player_identify_by_mark(string $mark, int $game): ?int {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `player` WHERE `mark` = ? AND `game` = ? LIMIT 1');
	$stmt->bind_param('si', $mark, $game);
	return stmt_cell($stmt);
}

function player_get_team(int $id): ?int {
	global $db;
	$stmt = $db->prepare('SELECT `team` FROM `player` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	return stmt_cell($stmt);
}

function player_count_attempts(int $id): int {
	global $db;
	$stmt = $db->prepare('SELECT COUNT(`attempt`) FROM `participant` WHERE `player` = ?');
	$stmt->bind_param('i', $id);
	return stmt_cell($stmt);
}

function player_insert(string $name, string $mark, int $team, int $game): void {
	global $db;
	$stmt = $db->prepare('INSERT INTO `player` (`name`, `mark`, `team`, `game`) VALUES (?, ?, ?, ?)');
	$stmt->bind_param('ssii', $name, $mark, $team, $game);
	$stmt->execute();
	$stmt->close();
}

function player_update(int $id, string $name, string $mark, int $team): void {
	global $db;
	$stmt = $db->prepare('UPDATE `player` SET `name` = ?, `mark` = ?, `team` = ? WHERE `id` = ?');
	$stmt->bind_param('ssii', $name, $mark, $team, $id);
	$stmt->execute();
	$stmt->close();
}

function player_delete(int $id): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `player` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	$stmt->execute();
	$stmt->close();
}

function player_truncate(int $game): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `player` WHERE `game` = ?');
	$stmt->bind_param('i', $game);
	$stmt->execute();
	$stmt->close();
}

// attempt

function attempt_select_by_game(int $game): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `station`, `team`, `score`, `time` FROM `attempt` WHERE `game` = ? ORDER BY `time` ASC, `id` ASC');
	$stmt->bind_param('i', $game);
	$attempt_list = stmt_list($stmt);
	$attempt_list = array_map(function(array $item): array {
		$item['time_sql'] = DT::from_int($item['time'])->to_sql();
		$item['player_list'] = [];
		return $item;
	}, $attempt_list);
	$attempt_list = array_combine(array_column($attempt_list, 'id'), $attempt_list);
	$stmt = $db->prepare('SELECT `attempt`, `player` FROM `participant` WHERE `game` = ? ORDER BY `attempt` ASC');
	$stmt->bind_param('i', $game);
	$participant_list = stmt_list($stmt);
	foreach ($participant_list as $participant) {
		$attempt = $participant['attempt'];
		$attempt_list[$attempt]['player_list'][] = $participant['player'];
	}
	return array_values($attempt_list);
}

function attempt_select_by_station(int $station): array {
	global $db;
	$stmt = $db->prepare('SELECT `id`, `station`, `team`, `score`, `time` FROM `attempt` WHERE `station` = ? ORDER BY `time` ASC, `id` ASC');
	$stmt->bind_param('i', $station);
	$attempt_list = stmt_list($stmt);
	$attempt_list = array_map(function(array $item): array {
		$item['time_sql'] = DT::from_int($item['time'])->to_sql();
		$item['player_list'] = [];
		return $item;
	}, $attempt_list);
	$attempt_list = array_combine(array_column($attempt_list, 'id'), $attempt_list);
	$stmt = $db->prepare('
	SELECT `attempt`.`id` AS `attempt`, `participant`.`player`
	FROM `participant`
	JOIN `attempt` ON `attempt`.`id` = `participant`.`attempt` AND `attempt`.`station` = ?
	');
	$stmt->bind_param('i', $station);
	$participant_list = stmt_list($stmt);
	foreach ($participant_list as $participant) {
		$attempt = $participant['attempt'];
		$attempt_list[$attempt]['player_list'][] = $participant['player'];
	}
	return array_values($attempt_list);
}

function attempt_belongs_to_game(int $id, int $game): bool {
	global $db;
	$stmt = $db->prepare('SELECT `id` FROM `attempt` WHERE `id` = ? AND `game` = ?');
	$stmt->bind_param('ii', $id, $game);
	return stmt_bool($stmt);
}

function attempt_insert(int $station, int $team, int $score, DT $time, int $game): int {
	global $db;
	$time = $time->to_int();
	$stmt = $db->prepare('INSERT INTO `attempt` (`station`, `team`, `score`, `time`, `game`) VALUES (?, ?, ?, ?, ?)');
	$stmt->bind_param('iiiii', $station, $team, $score, $time, $game);
	$stmt->execute();
	$id = $stmt->insert_id;
	$stmt->close();
	return $id;
}

function attempt_delete(int $id): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `attempt` WHERE `id` = ?');
	$stmt->bind_param('i', $id);
	$stmt->execute();
	$stmt->close();
}

function attempt_delete_by_range(DT $game_start, DT $game_stop, int $game): void {
	global $db;
	$game_start = $game_start->to_int();
	$game_stop = $game_stop->to_int();
	$stmt = $db->prepare('DELETE FROM `attempt` WHERE `game` = ? AND (`time` < ? OR `time` >= ?)');
	$stmt->bind_param('iii', $game, $game_start, $game_stop);
	$stmt->execute();
	$stmt->close();
}

function attempt_truncate(int $game): void {
	global $db;
	$stmt = $db->prepare('DELETE FROM `attempt` WHERE `game` = ?');
	$stmt->bind_param('i', $game);
	$stmt->execute();
	$stmt->close();
}

// participant

function participant_select_by_game(int $game): array {
	global $db;
	$stmt = $db->prepare('SELECT `attempt`, `player` FROM `participant` WHERE `game` = ?');
	$stmt->bind_param('i', $game);
	return stmt_list($stmt);
}

function participant_insert(int $attempt, int $player, int $game): void {
	global $db;
	$stmt = $db->prepare('INSERT INTO `participant` (`attempt`, `player`, `game`) VALUES (?, ?, ?)');
	$stmt->bind_param('iii', $attempt, $player, $game);
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

// TODO strip html from strings

if (is_post('game_register')) {
	$name = post_slug('name');
	if (!is_null(game_identify_by_name($name)))
		json(NULL);
	$title = post_string_nullable('title');
	$password = post_string('password');
	$game_start = post_string('game_start');
	$game_start = DT::from_js($game_start);
	$game_stop = post_string('game_stop');
	$game_stop = DT::from_js($game_stop);
	if ($game_stop->to_int() < $game_start->to_int())
		exit('game_stop');
	$reward_success = 300;
	$reward_conquest = 140;
	$reward_rate = 0.0;
	$id = game_insert($name, $title, $password, $game_start, $game_stop, $reward_success, $reward_conquest, $reward_rate);
	json([
		'game' => game_select_by_id($id),
		'polygon_list' => polygon_select_by_game($id),
		'station_list' => station_select_by_game($id, TRUE),
		'team_list' => team_select_by_game($id),
		'player_list' => player_select_by_game($id),
		'attempt_list' => attempt_select_by_game($id),
	]);
}

if (is_post('game_login')) {
	$name = post_slug('name');
	$id = game_identify_by_name($name);
	if (is_null($id))
		json('name');
	$password = post_string('password');
	if (!game_matches($id, $password))
		json('password');
	json([
		'game' => game_select_by_id($id),
		'polygon_list' => polygon_select_by_game($id),
		'station_list' => station_select_by_game($id, TRUE),
		'team_list' => team_select_by_game($id),
		'player_list' => player_select_by_game($id),
		'attempt_list' => attempt_select_by_game($id),
	]);
}

// TODO manage game: delete, clone

if (is_post('game_update')) {
	$id = post_int('id');
	$password = post_string('password');
	if (!game_matches($id, $password))
		exit('password');
	$title = post_string_nullable('title');
	$game_start = post_string('game_start');
	$game_start = DT::from_js($game_start);
	$game_stop = post_string('game_stop');
	$game_stop = DT::from_js($game_stop);
	if ($game_stop->to_int() < $game_start->to_int())
		exit('game_stop');
	$reward_success = post_int('reward_success');
	$reward_conquest = post_int('reward_conquest');
	$reward_rate = post_float('reward_rate');
	$css = post_string_nullable('css');
	$translation = post_string_nullable('translation');
	game_update($id, $title, $game_start, $game_stop, $reward_success, $reward_conquest, $reward_rate, $css, $translation);
	attempt_delete_by_range($game_start, $game_stop, $id);
	json([
		'game' => game_select_by_id($id),
		'attempt_list' => attempt_select_by_game($id),
	]);
}

if (is_post('game_map_insert')) {
	$id = post_int('id');
	$password = post_string('password');
	if (!game_matches($id, $password))
		exit('password');
	$game = game_select_by_id($id);
	if (!is_null($game['map']))
		exit('id');
	$map = post_file('map');
	if (!check_file($map['tmp_name'], 'image', 256 * 1024))
		exit('map');
	$map = move_file($map['tmp_name'], 'maps', sprintf('%s-%d.%s', $game['name'], time(), pathinfo($map['name'], PATHINFO_EXTENSION)));
	game_map_update($id, $map);
	json(game_select_by_id($id));
}

if (is_post('game_map_delete')) {
	$id = post_int('id');
	$password = post_string('password');
	if (!game_matches($id, $password))
		exit('password');
	$game = game_select_by_id($id);
	if (is_null($game['map']))
		exit('id');
	if (unlink($game['map']) === FALSE)
		exit('unlink');
	game_map_update($id, NULL);
	json(game_select_by_id($id));
}

if (is_post('game_password_update')) {
	$id = post_int('id');
	$password = post_string('password');
	if (!game_matches($id, $password))
		exit('password');
	$new_password = post_string('new_password');
	game_password_update($id, $new_password);
	json(NULL);
}

if (is_post('polygon_insert')) {
	$game = post_int('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$name = post_string('name');
	$content = post_string_nullable('content');
	polygon_insert($name, $content, $game);
	json(polygon_select_by_game($game));
}

if (is_post('polygon_update')) {
	$game = post_int('game');
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
	$game = post_int('game');
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

if (is_post('station_insert')) {
	$game = post_int('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$name = post_string('name');
	$code = post_string('code');
	$polygon = post_int_nullable('polygon');
	if (!is_null($polygon)) {
		if (!polygon_belongs_to_game($polygon, $game))
			exit('polygon');
		if (!is_null(station_identify_by_polygon($polygon)))
			exit('polygon');
	}
	$capacity = post_int('capacity');
	if ($capacity <= 0)
		exit('capacity');
	$score_sign = post_int('score_sign') > 0;
	$score_base = post_int_nullable('score_base');
	$score_high = post_int_nullable('score_high');
	station_insert($name, $code, $polygon, $capacity, $score_sign, $score_base, $score_high, $game);
	json(station_select_by_game($game, TRUE));
}

if (is_post('station_update')) {
	$game = post_int('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!station_belongs_to_game($id, $game))
		exit('id');
	$name = post_string('name');
	$code = post_string('code');
	$polygon = post_int_nullable('polygon');
	if (!is_null($polygon)) {
		if (!polygon_belongs_to_game($polygon, $game))
			exit('polygon');
		$station = station_identify_by_polygon($polygon);
		if (!is_null($station) && $station !== $id)
			exit('polygon');
	}
	$capacity = post_int('capacity');
	if ($capacity <= 0)
		exit('capacity');
	$score_sign = post_int('score_sign') > 0;
	$score_base = post_int_nullable('score_base');
	$score_high = post_int_nullable('score_high');
	station_update($id, $name, $code, $polygon, $capacity, $score_sign, $score_base, $score_high);
	json(station_select_by_game($game, TRUE));
}

if (is_post('station_delete')) {
	$game = post_int('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!station_belongs_to_game($id, $game))
		exit('id');
	if (station_count_attempts($id) !== 0)
		exit('id');
	station_delete($id);
	json(station_select_by_game($game, TRUE));
}

if (is_post('team_insert')) {
	$game = post_int('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$name = post_string('name');
	if (!is_null(team_identify_by_name($name, $game)))
		json(NULL);
	$background_color = post_string('background_color');
	$text_color = post_string('text_color');
	team_insert($name, $background_color, $text_color, $game);
	json(team_select_by_game($game));
}

if (is_post('team_update')) {
	$game = post_int('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!team_belongs_to_game($id, $game))
		exit('id');
	$name = post_string('name');
	$team = team_identify_by_name($name, $game);
	if (!is_null($team) && $team !== $id)
		json(NULL);
	$background_color = post_string('background_color');
	$text_color = post_string('text_color');
	team_update($id, $name, $background_color, $text_color);
	json(team_select_by_game($game));
}

if (is_post('team_delete')) {
	$game = post_int('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!team_belongs_to_game($id, $game))
		exit('id');
	if (team_count_players($id) !== 0)
		exit('id');
	if (team_count_attempts($id) !== 0)
		exit('id');
	team_delete($id);
	json(team_select_by_game($game));
}

if (is_post('player_insert')) {
	$game = post_int('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$name = post_string('name');
	$mark = post_string('mark');
	if (!is_null(player_identify_by_mark($mark, $game)))
		json(NULL);
	$team = post_int('team');
	if (!team_belongs_to_game($team, $game))
		exit('team');
	player_insert($name, $mark, $team, $game);
	json(player_select_by_game($game));
}

if (is_post('player_update')) {
	$game = post_int('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!player_belongs_to_game($id, $game))
		exit('id');
	$name = post_string('name');
	$mark = post_string('mark');
	$player = player_identify_by_mark($mark, $game);
	if (!is_null($player) && $player !== $id)
		json(NULL);
	$team = post_int('team');
	if (!team_belongs_to_game($team, $game))
		exit('team');
	player_update($id, $name, $mark, $team);
	json(player_select_by_game($game));
}

if (is_post('player_delete')) {
	$game = post_int('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	$id = post_int('id');
	if (!player_belongs_to_game($id, $game))
		exit('id');
	if (!player_count_attempts($id) !== 0)
		exit('id');
	player_delete($id);
	json(player_select_by_game($game));
}

if (is_post('player_import')) {
	$game = post_int('game');
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
		$team = team_identify_by_name($team, $game);
		if (is_null($team))
			return 'Player team not found.';
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
	attempt_truncate($game);
	player_truncate($game);
	foreach ($player_list as $player)
		player_insert($player['name'], $player['mark'], $player['team'], $game);
	json(player_select_by_game($game));
}

if (is_post('attempt_truncate')) {
	$game = post_int('game');
	$password = post_string('password');
	if (!game_matches($game, $password))
		exit('password');
	attempt_truncate($game);
	json(NULL);
}

if (is_post('station_list')) {
	$game = post_string('game');
	$game = game_identify_by_name($game);
	if (is_null($game))
		json(NULL);
	json([
		'game' => game_select_by_id($game),
		'time' => time(),
		'station_list' => station_select_by_game($game),
	]);
}

if (is_post('station_login')) {
	$game = post_string('game');
	$game = game_identify_by_name($game);
	if (is_null($game))
		exit('game');
	$station = post_int('station');
	if (!station_belongs_to_game($station, $game))
		exit('station');
	$code = post_string('code');
	if (!station_matches($station, $code))
		json(NULL);
	json([
		'game' => game_select_by_id($game),
		'time' => time(),
		'station_list' => station_select_by_game($game),
		'team_list' => team_select_by_game($game),
		'player_list' => player_select_by_game($game),
		'attempt_list' => attempt_select_by_station($station),
	]);
}

if (is_post('attempt_insert')) {
	$game = post_string('game');
	$game = game_identify_by_name($game);
	if (is_null($game))
		exit('game');
	$station = post_int('station');
	if (!station_belongs_to_game($station, $game))
		exit('station');
	$code = post_string('code');
	if (!station_matches($station, $code))
		exit('code');
	$score = post_int('score');
	$participant_list = post_string('participant_list');
	$participant_list = explode(',', $participant_list);
	$team = NULL;
	$participant_list = array_map(function(string $participant) use ($game, &$team): int {
		$participant = filter_var($participant, FILTER_VALIDATE_INT);
		if ($participant === FALSE)
			exit('participant_list');
		if (!player_belongs_to_game($participant, $game))
			exit('participant_list');
		$t = player_get_team($participant);
		if (is_null($team))
			$team = $t;
		elseif ($team !== $t)
			exit('participant_list');
		return $participant;
	}, $participant_list);
	if (count(array_unique($participant_list, SORT_NUMERIC)) !== count($participant_list))
		exit('participant_list');
	if (count($participant_list) !== station_get_capacity($station))
		exit('participant_list');
	$time = DT::from_now();
	$game_start = game_get_start($game);
	if ($time->to_int() < $game_start->to_int())
		exit('game');
	$game_stop = game_get_stop($game);
	if ($time->to_int() >= $game_stop->to_int())
		exit('game');
	$attempt = attempt_insert($station, $team, $score, $time, $game);
	foreach ($participant_list as $participant)
		participant_insert($attempt, $participant, $game);
	json([
		'game' => game_select_by_id($game),
		'time' => time(),
		'station_list' => station_select_by_game($game),
		'team_list' => team_select_by_game($game),
		'player_list' => player_select_by_game($game),
		'attempt_list' => attempt_select_by_station($station),
	]);
}

if (is_post('attempt_delete')) {
	$game = post_string('game');
	$game = game_identify_by_name($game);
	if (is_null($game))
		exit('game');
	$station = post_int('station');
	if (!station_belongs_to_game($station, $game))
		exit('station');
	$code = post_string('code');
	if (!station_matches($station, $code))
		exit('code');
	$id = post_int('id');
	if (!attempt_belongs_to_game($id, $game))
		exit('id');
	attempt_delete($id);
	json([
		'game' => game_select_by_id($game),
		'time' => time(),
		'station_list' => station_select_by_game($game),
		'team_list' => team_select_by_game($game),
		'player_list' => player_select_by_game($game),
		'attempt_list' => attempt_select_by_station($station),
	]);
}

if (is_post('live')) {
	$game = post_string('game');
	$game = game_identify_by_name($game);
	if (is_null($game))
		json(NULL);
	json([
		'game' => game_select_by_id($game),
		'polygon_list' => polygon_select_by_game($game),
		'station_list' => station_select_by_game($game),
		'team_list' => team_select_by_game_with_players($game),
		'attempt_list' => attempt_select_by_game($game),
		'time' => DT::from_now()->to_int(),
	]);
}

if (is_post('draw')) {
	$name = post_string('name');
	$id = game_identify_by_name($name);
	if (is_null($id))
		json(NULL);
	$password = post_string('password');
	if (!game_matches($id, $password))
		json(NULL);
	json([
		'game' => game_select_by_id($id),
		'station_list' => station_select_by_game($id),
		'team_list' => team_select_by_game($id),
		'player_list' => player_select_by_game($id),
		'attempt_list' => attempt_select_by_game($id),
		'participant_list' => participant_select_by_game($id),
	]);
}

exit('action');
