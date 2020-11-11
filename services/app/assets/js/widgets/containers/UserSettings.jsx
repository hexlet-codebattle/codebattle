import React, { useState } from 'react';
import axios from 'axios';

const UserSettings = () => {
  const [text, setText] = useState('');
  const getProxyUrl = url => {
    const proxy = 'https://cors-anywhere.herokuapp.com/';
    const feedUrl = new URL(url);
    const proxyUrl = new URL(`${feedUrl.host}${feedUrl.pathname}`, proxy);

    return proxyUrl.href;
  };

  const handleChange = e => setText(e.target.value);

  const handleSubmit = async e => {
    e.preventDefault();
    // axios({
    //   url: '/settings',
    //   method: 'put',
    //   data: { name: text },
    //   xsrfCookieName: 'XSRF-TOKEN',
    //   xsrfHeaderName: 'X-XSRF-TOKEN',
    // })

    const bodyFormData = new FormData();
    bodyFormData.append('user[name]', text);
    bodyFormData.append('_method', 'put');
    bodyFormData.append('xsrfHeaderName', 'X-CSRF-TOKEN');

    await axios.post('/settings', bodyFormData)
    .catch(err => {
      console.error(err);
    });
  };
  return (
    <div className="container bg-white shadow-sm py-4">
      <div className="text-center">
        <h2 className="font-weight-normal">Settings</h2>
      </div>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="_method" value="put" />
        <input type="hidden" name="_csrf_token" value="@changeset" />
        <div className="col-4 form-group">
          <div className="form-group">
            <div>
              <label htmlFor="user_name">Name</label>
              <input onChange={handleChange} id="user_name" className="form-control" type="text" value={text} />
            </div>
          </div>
          <button className="btn btn-primary" aria-label="Save" type="submit">Save</button>
        </div>
      </form>
    </div>
);
};

export default UserSettings;
