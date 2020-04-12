var http = require('http');
var cookie = require('cookie');

http.createServer(function(request, response){
    console.log(request.headers.cookie);

    if(undefined !== request.headers.cookie){
        var cookies = cookie.parse(request.headers.cookie);
    }

    console.log(cookies.yummy_cookie);
    response.writeHead(200, {
        // 쿠키를 key-value 형태로 생성한다. 
        'Set-Cookie':['yummy_cookie=choco', 
                    'tasty-cookie=strawberry',
                    `Permanent=cookies; Max-Age=${60*60*24*30}`,
                    'Secure=Secure; Secure',
                    'HttpOnly=HttpOnly; HttpOnly',
                    'Path=Path; Path=/cookie',
                    'Domain-Domain; Domain=o2.org'
    ]
    });
    response.end('Cookie!!');
}).listen(3000);