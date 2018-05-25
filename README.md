本系统基于https://github.com/CTFd/CTFd 进行汉化，目前本系统版本为1.2.0

改进点：
1.对前端页面进行汉化；
2.用户个人字段信息改为：年级/专业/学院。同时修改了用户列表的显示内容；
3.挑战页面根据题目分类进行分块显示，同时显示各分类的题目总数和已完成数；
4.优化挑战页面加载方式，由原来的全部加载，改为按分类异步加载；
5.管理员后台的挑战题目添加分页功能。
6.管理员后台的用户列表的显示内容也改为年级/专业/学院。

部署方式：
1.CTFd的配置文件，默认系统为ubuntu，如果使用其他系统，请自行修改prepare.sh文件
2.执行./prepare.sh，下载相关包
3.修改CTFd/config.py配置文件
参考：https://github.com/CTFd/CTFd/wiki/Advanced-Deployment

主要配置有三个：
#安全密钥
#可以保持不变
#可以执行"python -c "import os; print repr(os.urandom(32))" 生成一串密钥，然后赋值给SECRET_KEY
SECRET_KEY = os.environ.get('SECRET_KEY') or key
#SECRET_KEY = \********


#mysql数据库配置
#SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///{}/ctfd.db'.format(os.path.dirname(os.path.abspath(__file__))) 
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:123456@localhost/ctfd' #root为mysql用户名，123456为mysql密码

#redis配置 看代码貌似没有用
#REDIS_URL = 'redis://:@localhost:6379' #新增这个变量的赋值
CACHE_REDIS_URL = os.environ.get('REDIS_URL')

4.安装好nginx
5.在/etc/nginx/conf.d目录下添加ctfd.conf文件，内容如下
server {
    listen       80;

    server_name localhost;

    charset utf-8;

    client_max_body_size 100m;

    access_log  /var/log/nginx/ctfd.access.log  main;

    location ~ .*\.(js|css|woff|woff2|txt|png|jpg|jpeg)$ {
        include uwsgi_params;
        uwsgi_pass unix:/tmp/uwsgi.sock;
        expires 7d;
    }

    location / {
        include uwsgi_params;
        uwsgi_pass unix:/tmp/uwsgi.sock;
    }

    error_page 404 500 502 503 504 /50x.html;

    location = /50x.html {
        root html;
    }
}
自行修改listen端口，日志输出路径等
然后重启nginx

6.修改ctfd.ini的参数值，优化uswgi

7.创建名为ctfd_service.sh
#!/bin/bash
### BEGIN INIT INFO
# Provides:          lsp
# Required-Start:    $local_fs $network
# Required-Stop:     $local_fs
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: ctfd daemon
# Description:       ctfd daemon
### END INIT INFO

cd /home/aotu/CTFd
uwsgi --ini ctfd.ini

exit 0

8. 添加权限
sudo chmod +x ctfd_service.sh

9.放在启动目录下
sudo mv ctfd_service.sh /etc/init.d

10.添加自启动
cd /etc/init.d/
sudo update-rc.d ctfd_service.sh defaults 90
#删除的命令如下
sudo update-rc.d -f ctfd_service.sh remove

11.启动
service ctfd_service start | stop | status

Done!
