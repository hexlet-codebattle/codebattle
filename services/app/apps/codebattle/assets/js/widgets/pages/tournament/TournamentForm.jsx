import React, { useState, useEffect, useCallback } from 'react';

import cn from 'classnames';
import PropTypes from 'prop-types';

const TASK_PROVIDERS = [
  { value: 'level', label: 'Level' },
  { value: 'task_pack', label: 'Task Pack' },
  { value: 'tags', label: 'Tags' },
];

const TASK_STRATEGIES = [
  { value: 'random', label: 'Random' },
  { value: 'sequential', label: 'Sequential' },
];

const ACCESS_TYPES = [
  { value: 'public', label: 'Public' },
  { value: 'token', label: 'Token (Private)' },
];

const LEVELS = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const RANKING_TYPES = [
  { value: 'by_user', label: 'By User' },
  { value: 'by_clan', label: 'By Clan' },
];

const SCORE_STRATEGIES = [
  { value: '75_percentile', label: '75 Percentile' },
  { value: 'win_loss', label: 'Win/Loss' },
];

const PLAYERS_LIMITS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];

function TournamentForm({
  initialValues = {},
  onSubmit,
  onValidate,
  errors = {},
  isSubmitting = false,
  submitButtonText = 'Create Tournament',
  taskPackNames = [],
  userTimezone = 'UTC',
  showCancelButton = false,
  cancelButtonText = 'Cancel',
  onCancel,
}) {
  const [formData, setFormData] = useState({
    name: initialValues.name || '',
    description: initialValues.description || '',
    starts_at: initialValues.starts_at || '',
    access_type: initialValues.access_type || 'public',
    task_provider: initialValues.task_provider || 'level',
    task_strategy: initialValues.task_strategy || 'random',
    level: initialValues.level || 'easy',
    task_pack_name: initialValues.task_pack_name || '',
    tags: initialValues.tags || '',
    players_limit: initialValues.players_limit || 64,
    rounds_limit: initialValues.rounds_limit || 7,
    round_timeout_seconds: initialValues.round_timeout_seconds || 177,
    break_duration_seconds: initialValues.break_duration_seconds || 42,
    use_chat: initialValues.use_chat !== undefined ? initialValues.use_chat : true,
    use_clan: initialValues.use_clan !== undefined ? initialValues.use_clan : false,
    ranking_type: initialValues.ranking_type || 'by_user',
    score_strategy: initialValues.score_strategy || '75_percentile',
    meta_json: initialValues.meta_json || '{}',
  });

  useEffect(() => {
    if (onValidate) {
      onValidate(formData);
    }
  }, [formData, onValidate]);

  const handleChange = useCallback(e => {
    const {
 name, value, type, checked,
} = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleSubmit = useCallback(e => {
    e.preventDefault();
    onSubmit(formData);
  }, [formData, onSubmit]);

  const renderError = fieldName => {
    if (errors[fieldName]) {
      return (
        <div className="invalid-feedback d-block">
          {Array.isArray(errors[fieldName]) ? errors[fieldName].join(', ') : errors[fieldName]}
        </div>
      );
    }
    return null;
  };

  return (
    <form onSubmit={handleSubmit} className="w-100">
      {/* Base Errors */}
      {errors.base && (
        <div className="alert alert-danger mb-4" role="alert">
          {errors.base}
        </div>
      )}

      {/* Basic Information Section */}
      <div className="card cb-card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Basic Information</h5>
        </div>
        <div className="card-body">
          <div className="form-group mb-3">
            <label htmlFor="name" className="form-label text-white">
              Tournament Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className={cn(
                'form-control cb-bg-panel cb-border-color text-white cb-rounded',
                { 'is-invalid': errors.name },
              )}
              value={formData.name}
              onChange={handleChange}
              maxLength={42}
              required
            />
            {renderError('name')}
          </div>

          <div className="form-group mb-3">
            <label htmlFor="description" className="form-label text-white">
              Description (Markdown supported)
            </label>
            <textarea
              id="description"
              name="description"
              className={cn(
                'form-control cb-bg-panel cb-border-color text-white cb-rounded',
                { 'is-invalid': errors.description },
              )}
              value={formData.description}
              onChange={handleChange}
              rows={8}
              maxLength={7531}
              required
            />
            {renderError('description')}
          </div>
        </div>
      </div>

      {/* Schedule & Access Section */}
      <div className="card cb-card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Schedule & Access</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="starts_at" className="form-label text-white">
                Starts at (
                {userTimezone}
                )
              </label>
              <input
                type="datetime-local"
                id="starts_at"
                name="starts_at"
                className={cn(
                  'form-control cb-bg-panel cb-border-color text-white cb-rounded',
                  { 'is-invalid': errors.starts_at },
                )}
                value={formData.starts_at}
                onChange={handleChange}
                required
              />
              {renderError('starts_at')}
            </div>

            <div className="col-md-6 mb-3">
              <label htmlFor="access_type" className="form-label text-white">
                Access Type
              </label>
              <select
                id="access_type"
                name="access_type"
                className={cn(
                  'form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded',
                  { 'is-invalid': errors.access_type },
                )}
                value={formData.access_type}
                onChange={handleChange}
              >
                {ACCESS_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {renderError('access_type')}
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Features Section */}
      <div className="card cb-card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Tournament Features</h5>
        </div>
        <div className="card-body">
          <div className="d-flex gap-4">
            <div className="form-check">
              <input
                type="checkbox"
                id="use_chat"
                name="use_chat"
                className="form-check-input"
                checked={formData.use_chat}
                onChange={handleChange}
              />
              <label htmlFor="use_chat" className="form-check-label text-white">
                Use Chat
              </label>
            </div>

            <div className="form-check">
              <input
                type="checkbox"
                id="use_clan"
                name="use_clan"
                className="form-check-input"
                checked={formData.use_clan}
                onChange={handleChange}
              />
              <label htmlFor="use_clan" className="form-check-label text-white">
                Use Clan
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Task Configuration Section */}
      <div className="card cb-card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Task Configuration</h5>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-6 mb-3">
              <label htmlFor="task_provider" className="form-label text-white">
                Task Provider
              </label>
              <select
                id="task_provider"
                name="task_provider"
                className={cn(
                  'form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded',
                  { 'is-invalid': errors.task_provider },
                )}
                value={formData.task_provider}
                onChange={handleChange}
              >
                {TASK_PROVIDERS.map(provider => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
              {renderError('task_provider')}
            </div>

            <div className="col-md-6 mb-3">
              <label htmlFor="task_strategy" className="form-label text-white">
                Task Strategy
              </label>
              <select
                id="task_strategy"
                name="task_strategy"
                className={cn(
                  'form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded',
                  { 'is-invalid': errors.task_strategy },
                )}
                value={formData.task_strategy}
                onChange={handleChange}
              >
                {TASK_STRATEGIES.map(strategy => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
              {renderError('task_strategy')}
            </div>
          </div>

          <div className="row">
            {(formData.task_provider === 'level' || formData.task_provider === 'tags') && (
              <div className="col-md-4 mb-3">
                <label htmlFor="level" className="form-label text-white">
                  Level
                </label>
                <select
                  id="level"
                  name="level"
                  className={cn(
                    'form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded',
                    { 'is-invalid': errors.level },
                  )}
                  value={formData.level}
                  onChange={handleChange}
                >
                  {LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
                {renderError('level')}
              </div>
            )}

            {formData.task_provider === 'task_pack' && (
              <div className="col-md-4 mb-3">
                <label htmlFor="task_pack_name" className="form-label text-white">
                  Task Pack
                </label>
                <select
                  id="task_pack_name"
                  name="task_pack_name"
                  className={cn(
                    'form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded',
                    { 'is-invalid': errors.task_pack_name },
                  )}
                  value={formData.task_pack_name}
                  onChange={handleChange}
                >
                  <option value="">Select a task pack</option>
                  {taskPackNames.map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {renderError('task_pack_name')}
              </div>
            )}

            {formData.task_provider === 'tags' && (
              <div className="col-md-8 mb-3">
                <label htmlFor="tags" className="form-label text-white">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  className={cn(
                    'form-control cb-bg-panel cb-border-color text-white cb-rounded',
                    { 'is-invalid': errors.tags },
                  )}
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="strings,math"
                />
                {renderError('tags')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tournament Settings Section */}
      <div className="card cb-card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Tournament Settings</h5>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-4 mb-3">
              <label htmlFor="players_limit" className="form-label text-white">
                Players Limit
              </label>
              <select
                id="players_limit"
                name="players_limit"
                className={cn(
                  'form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded',
                  { 'is-invalid': errors.players_limit },
                )}
                value={formData.players_limit}
                onChange={handleChange}
              >
                {PLAYERS_LIMITS.map(limit => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
              {renderError('players_limit')}
            </div>

            <div className="col-md-4 mb-3">
              <label htmlFor="ranking_type" className="form-label text-white">
                Ranking Type
              </label>
              <select
                id="ranking_type"
                name="ranking_type"
                className={cn(
                  'form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded',
                  { 'is-invalid': errors.ranking_type },
                )}
                value={formData.ranking_type}
                onChange={handleChange}
              >
                {RANKING_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {renderError('ranking_type')}
            </div>

            <div className="col-md-4 mb-3">
              <label htmlFor="score_strategy" className="form-label text-white">
                Score Strategy
              </label>
              <select
                id="score_strategy"
                name="score_strategy"
                className={cn(
                  'form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded',
                  { 'is-invalid': errors.score_strategy },
                )}
                value={formData.score_strategy}
                onChange={handleChange}
              >
                {SCORE_STRATEGIES.map(strategy => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
              {renderError('score_strategy')}
            </div>
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label htmlFor="rounds_limit" className="form-label text-white">
                Rounds Limit
              </label>
              <select
                id="rounds_limit"
                name="rounds_limit"
                className={cn(
                  'form-select custom-select cb-bg-panel cb-border-color text-white cb-rounded',
                  { 'is-invalid': errors.rounds_limit },
                )}
                value={formData.rounds_limit}
                onChange={handleChange}
              >
                {Array.from({ length: 42 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
              {renderError('rounds_limit')}
            </div>

            <div className="col-md-4 mb-3">
              <label htmlFor="round_timeout_seconds" className="form-label text-white">
                Round Timeout (seconds)
              </label>
              <input
                type="number"
                id="round_timeout_seconds"
                name="round_timeout_seconds"
                className={cn(
                  'form-control cb-bg-panel cb-border-color text-white cb-rounded',
                  { 'is-invalid': errors.round_timeout_seconds },
                )}
                value={formData.round_timeout_seconds}
                onChange={handleChange}
                min={100}
                max={10000}
              />
              {renderError('round_timeout_seconds')}
            </div>

            <div className="col-md-4 mb-3">
              <label htmlFor="break_duration_seconds" className="form-label text-white">
                Break Duration (seconds)
              </label>
              <input
                type="number"
                id="break_duration_seconds"
                name="break_duration_seconds"
                className={cn(
                  'form-control cb-bg-panel cb-border-color text-white cb-rounded',
                  { 'is-invalid': errors.break_duration_seconds },
                )}
                value={formData.break_duration_seconds}
                onChange={handleChange}
                min={0}
                max={100000}
              />
              {renderError('break_duration_seconds')}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings Section */}
      <div className="card cb-card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Advanced Settings</h5>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label htmlFor="meta_json" className="form-label text-white">
              Meta JSON
            </label>
            <textarea
              id="meta_json"
              name="meta_json"
              className={cn(
                'form-control cb-bg-panel cb-border-color text-white cb-rounded',
                { 'is-invalid': errors.meta_json },
              )}
              value={formData.meta_json}
              onChange={handleChange}
              rows={4}
            />
            {renderError('meta_json')}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex justify-content-between align-items-center mt-4">
        {showCancelButton && (
          <button
            type="button"
            className="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelButtonText}
          </button>
        )}
        <button
          type="submit"
          className="btn btn-secondary cb-btn-secondary cb-rounded px-4"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : submitButtonText}
        </button>
      </div>
    </form>
  );
}

TournamentForm.propTypes = {
  initialValues: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    starts_at: PropTypes.string,
    access_type: PropTypes.string,
    task_provider: PropTypes.string,
    task_strategy: PropTypes.string,
    level: PropTypes.string,
    task_pack_name: PropTypes.string,
    tags: PropTypes.string,
    players_limit: PropTypes.number,
    rounds_limit: PropTypes.number,
    round_timeout_seconds: PropTypes.number,
    break_duration_seconds: PropTypes.number,
    use_chat: PropTypes.bool,
    use_clan: PropTypes.bool,
    ranking_type: PropTypes.string,
    score_strategy: PropTypes.string,
    meta_json: PropTypes.string,
  }),
  onSubmit: PropTypes.func.isRequired,
  onValidate: PropTypes.func,
  errors: PropTypes.shape({
    base: PropTypes.string,
    name: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    description: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    starts_at: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    access_type: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    task_provider: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    task_strategy: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    level: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    task_pack_name: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    tags: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    players_limit: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    rounds_limit: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    round_timeout_seconds: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    break_duration_seconds: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    ranking_type: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    score_strategy: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    meta_json: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  }),
  isSubmitting: PropTypes.bool,
  submitButtonText: PropTypes.string,
  taskPackNames: PropTypes.arrayOf(PropTypes.string),
  userTimezone: PropTypes.string,
  showCancelButton: PropTypes.bool,
  cancelButtonText: PropTypes.string,
  onCancel: PropTypes.func,
};

TournamentForm.defaultProps = {
  initialValues: {},
  onValidate: null,
  errors: {},
  isSubmitting: false,
  submitButtonText: 'Create Tournament',
  taskPackNames: [],
  userTimezone: 'UTC',
  showCancelButton: false,
  cancelButtonText: 'Cancel',
  onCancel: null,
};

export default TournamentForm;
