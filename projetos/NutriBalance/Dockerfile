# Backend do NutriBalance — so a API PHP e as fotos de perfil.
#
# O front (HTML, CSS, JS, imagens) nao entra nesta imagem: quem serve aquilo e
# o Netlify. Aqui fica apenas o que precisa de PHP rodando de verdade.
#
# Contexto de build: a pasta projetos/NutriBalance/.

FROM php:8.2-apache

# O PDO ja vem no PHP, mas o driver de MySQL nao. Sem esta linha o
# `new PDO('mysql:...')` do conexao.php falha com "could not find driver".
RUN docker-php-ext-install pdo_mysql

# Ajustes de php.ini proprios do projeto — ver comentarios no arquivo.
COPY docker/php.ini /usr/local/etc/php/conf.d/nutribalance.ini

COPY site/api/     /var/www/html/api/
COPY site/uploads/ /var/www/html/uploads/

# O Apache roda como www-data. Sem esta permissao, o move_uploaded_file() do
# api/foto.php falha na hora de gravar a imagem.
RUN chown -R www-data:www-data /var/www/html/uploads

COPY docker/iniciar.sh /usr/local/bin/iniciar.sh
RUN chmod +x /usr/local/bin/iniciar.sh

CMD ["iniciar.sh"]
