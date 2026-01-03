<?php

function get_string_nullable(string $key): ?string {
	if (!isset($_GET[$key]))
		return NULL;
	$value = $_GET[$key];
	if (!is_string($value))
		exit($key);
	if (mb_strlen($value) === 0)
		return NULL;
	return $value;
}

function post_string_nullable(string $key): ?string {
	if (!isset($_POST[$key]))
		return NULL;
	$value = $_POST[$key];
	if (!is_string($value))
		exit($key);
	if (mb_strlen($key) === 0)
		return NULL;
	return $value;
}

function post_string(string $key): string {
	$value = post_string_nullable($key);
	if (is_null($value))
		exit($key);
	return $value;
}

function post_slug_nullable(string $key): ?string {
	$value = post_string_nullable($key);
	if (is_null($value))
		return NULL;
	$value = filter_var($value, FILTER_VALIDATE_REGEXP, [
		'options' => [
			'regexp' => '/^[-a-z0-9]{1,255}$/',
		],
	]);
	if ($value === FALSE)
		exit($key);
	return $value;
}

function post_slug(string $key): string {
	$value = post_slug_nullable($key);
	if (is_null($value))
		exit($key);
	return $value;
}

function post_int_nullable(string $key): ?int {
	$value = post_string_nullable($key);
	if (is_null($value))
		return NULL;
	$value = filter_var($value, FILTER_VALIDATE_INT);
	if ($value === FALSE)
		exit($key);
	return $value;
}

function post_int(string $key): int {
	$value = post_int_nullable($key);
	if (is_null($value))
		exit($key);
	return $value;
}

function post_float(string $key): float {
	$value = post_string($key);
	$value = filter_var($value, FILTER_VALIDATE_FLOAT);
	if ($value === FALSE)
		exit($key);
	return $value;
}

function post_file_nullable(string $key): ?array {
	if (!isset($_FILES[$key]))
		return NULL;
	$value = $_FILES[$key];
	if ($value['error'] !== UPLOAD_ERR_OK)
		exit($key);
	return $value;
}

function post_file(string $key): array {
	$value = post_file_nullable($key);
	if (is_null($value))
		exit($key);
	return $value;
}
