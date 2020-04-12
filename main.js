var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var template = require('./lib/template.js');
var path = require('path');
var sanitizeHtml = require('sanitize-html');
var cookie = require('cookie');


// 로그인 처리  - 쿠키 정보 가져오기 
function authIsOwner(request, response){
  var isOwner = false;
  var cookies = {}; // 빈 객체 
  
  if(request.headers.cookie){  // undefined 는 false와도 같다. 
    var cookies = cookie.parse(request.headers.cookie);
  }
  // DB에서 email, password 찾기 
  if(cookies.email === '123@gmail.com' && cookies.password === '123' ) {
    isOwner = true;
  }

  console.log('isOwner:', cookies);

  return isOwner;
}

// 로그아웃 처리 함수  ( 로그인, 로그아웃 상태에 따라 보여줄 버튼이 다르다. )
function authStatusUI(request, response){
      // isOwner : 로그인 성공/실패 값
      // var isOwner = authIsOwner(request, response);
      var authStatusUI =  '<a href="/login">login</a>';
      
      if(authIsOwner(request, response)){ // 로그인 성공 시, '로그아웃' 버튼 보이도록. 
        authStatusUI =  '<a href="/logout_process">logout!</a>';
      }
      // console.log('isOwner:', isOwner);
      
      return authStatusUI;
}


var app = http.createServer(function(request,response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;

    /*
    // isOwner : 로그인 성공/실패 값
    var isOwner = authIsOwner(request, response);
    var authStatusUI =  '<a href="/login">login</a>';
    
    if(isOwner){ // 로그인 성공 시, '로그아웃' 버튼 보이도록. 
      authStatusUI =  '<a href="/logout_process">logout!</a>';
    }
    console.log('isOwner:', isOwner);
*/

    if(pathname === '/'){
      if(queryData.id === undefined){
        fs.readdir('./data', function(error, filelist){  // home 
          var title = 'Welcome';
          var description = 'Hello, Node.js';
          var list = template.list(filelist);
          var html = template.HTML(title, list,
            `<h2>${title}</h2>${description}`,
            `<a href="/create">create</a>`,
            authStatusUI(request,response)
          );
          response.writeHead(200);
          response.end(html);
        });
      } else {
        fs.readdir('./data', function(error, filelist){  // 글 상세보기 
          var filteredId = path.parse(queryData.id).base;
          fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
            var title = queryData.id;
            var sanitizedTitle = sanitizeHtml(title);
            var sanitizedDescription = sanitizeHtml(description, {
              allowedTags:['h1']
            });
            var list = template.list(filelist);
            var html = template.HTML(sanitizedTitle, list,
              `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
              ` <a href="/create">create</a>
                <a href="/update?id=${sanitizedTitle}">update</a>
                <form action="delete_process" method="post">
                  <input type="hidden" name="id" value="${sanitizedTitle}">
                  <input type="submit" value="delete">
                </form>
                `,
                authStatusUI(request, response)
            );
            response.writeHead(200);
            response.end(html);
          });
        });
      }
    } else if(pathname === '/create'){  // 글 쓰기 화면 

      // 접근제어 
      if(authIsOwner(request, response) === false){
        // 작성자만 글 생성 가능하므로, 로그인 하라고 말하기.
        response.end('Login required ! ');
        return false;  //createServer 의 콜백 function 자체를 종료시킨다. 
      }


      fs.readdir('./data', function(error, filelist){
        var title = 'WEB - create';
        var list = template.list(filelist);
        var html = template.HTML(title, list, `
          <form action="/create_process" method="post">
            <p><input type="text" name="title" placeholder="title"></p>
            <p>
              <textarea name="description" placeholder="description"></textarea>
            </p>
            <p>
              <input type="submit">
            </p>
          </form>
        `, '', authStatusUI(request, response));
        response.writeHead(200);
        response.end(html);
      });
    } else if(pathname === '/create_process'){  // 글 생성 처리 

      // 접근제어 
      if(authIsOwner(request, response) === false){
        // 작성자만 글 생성 가능하므로, 로그인 하라고 말하기.
        response.end('Login required ! ');
        return false;  //createServer 의 콜백 function 자체를 종료시킨다. 
      }

      var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);
          var title = post.title;
          var description = post.description;
          fs.writeFile(`data/${title}`, description, 'utf8', function(err){
            response.writeHead(302, {Location: `/?id=${title}`});
            response.end();
          })
      });
    } else if(pathname === '/update'){  // 수정 

      // 접근제어 
      if(authIsOwner(request, response) === false){
        // 작성자만 글 생성 가능하므로, 로그인 하라고 말하기.
        response.end('Login required ! ');
        return false;  //createServer 의 콜백 function 자체를 종료시킨다. 
      }

      fs.readdir('./data', function(error, filelist){
        var filteredId = path.parse(queryData.id).base;
        fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
          var title = queryData.id;
          var list = template.list(filelist);
          var html = template.HTML(title, list,
            `
            <form action="/update_process" method="post">
              <input type="hidden" name="id" value="${title}">
              <p><input type="text" name="title" placeholder="title" value="${title}"></p>
              <p>
                <textarea name="description" placeholder="description">${description}</textarea>
              </p>
              <p>
                <input type="submit">
              </p>
            </form>
            `,
            `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`,
            authStatusUI(request, response)
          );
          response.writeHead(200);
          response.end(html);
        });
      });
    } else if(pathname === '/update_process'){  // 수정 처리 
      var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);
          var id = post.id;
          var title = post.title;
          var description = post.description;
          fs.rename(`data/${id}`, `data/${title}`, function(error){
            fs.writeFile(`data/${title}`, description, 'utf8', function(err){
              response.writeHead(302, {Location: `/?id=${title}`});
              response.end();
            })
          });
      });
    } else if(pathname === '/delete_process'){  // 삭제 처리 

      // 접근제어 
      if(authIsOwner(request, response) === false){
        // 작성자만 글 생성 가능하므로, 로그인 하라고 말하기.
        response.end('Login required ! ');
        return false;  //createServer 의 콜백 function 자체를 종료시킨다. 
      }

      var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);
          var id = post.id;
          var filteredId = path.parse(id).base;
          fs.unlink(`data/${filteredId}`, function(error){
            response.writeHead(302, {Location: `/`});
            response.end();
          })
      });

    } else if(pathname == '/login'){  // 로그인 폼 

      fs.readdir('./data', function(error, filelist){
        var title = 'Login';
        var list = template.list(filelist);
        var html = template.HTML(title, list,
          `
          <form action="/login_process", method="post">
            <p><input type="text" name="email" placeholder="email"></p>
            <p><input type="password" name="password" placeholder="password"></p>
            <p><input type="submit"></p>
          </form>`,
          `<a href="/create">create</a>`
        );

        response.writeHead(200);
        response.end(html);
      });

    } else if(pathname == "/login_process"){ // 로그인 처리 - 쿠키생성

      var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);

          if(post.email === '123@gmail.com' && post.password === '123' ) { // 로그인 성공 처리.
            console.log('login success')
            response.writeHead(302, {
              'Set-Cookie':[
                `email=${post.email}`, 
                `password=${post.password}`,
                `nickname=brocolia`  
              ],
              Location: `/`
            })
            response.end();
          }else{ // 로그인 실패 처리             
            console.log('login failed');
            response.end('login failed !');
          }
      });

    } else if(pathname == "/logout_process"){ // 로그아웃 처리 - 쿠키삭제 

      var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);

            response.writeHead(302, {
              'Set-Cookie':[
                `email=; Max-Age=0`, 
                `password=; Max-Age=0`,
                `nickname=; Max-Age=0`  
              ],
              Location: `/`
            });
            response.end();
      });

    } else {
      response.writeHead(404);
      response.end('Not found');
    }
});
app.listen(3000);
