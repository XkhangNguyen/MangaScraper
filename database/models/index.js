import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Manga = sequelize.define('manga', {
    MangaTitle: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'title',
    },
    MangaDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description',
    },
    CoverImageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'cover_image_url',
    },
    Author: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'author',
    },
  }, {
    timestamps: true,
  });

  const Genre = sequelize.define('genre', {
    genre_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    timestamps: false,
  });

  const Chapter = sequelize.define('chapter', {
    ChapterNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'chapter_number',
    },
    ChapterLink: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'chapter_link',
    },
  }, {
    timestamps: true,
  });

  const MangaGenre = sequelize.define('manga_genre', {

  });

  const ChapterImage = sequelize.define('chapter_image', {
    chapter_image_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    timestamps: false,
  });

  Genre.belongsToMany(Manga, { timestamps: false, through: MangaGenre });
  Manga.belongsToMany(Genre, { timestamps: false, through: MangaGenre });

  Manga.hasMany(Chapter);
  Chapter.belongsTo(Manga, { allowNull: false });

  Chapter.hasMany(ChapterImage);
  ChapterImage.belongsTo(Chapter, { allowNull: false });

}
